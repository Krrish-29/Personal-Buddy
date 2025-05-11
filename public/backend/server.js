import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { spawn, exec } from "child_process";
import os from "os";
import util from "util";
import dotenv from 'dotenv';
dotenv.config();

const execAsync = util.promisify(exec);
const QUERY_MODEL = process.env.QUERY_MODEL || "qwen3:latest";
const PORT = 5500;    
const BACKEND_PORT = 5000;
const OLLAMA_PORT = 11434;

async function killOllamaProcesses() {
  if (os.platform() === "win32") {
    try {
      const { stdout: processStdout } = await execAsync(`Get-Process | Where-Object { $_.ProcessName -like "*ollama*" }`);
      const ollamaPids = processStdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => /^\d+$/.test(line));

      const { stdout: portStdout } = await execAsync(`Get-NetTCPConnection -LocalPort 11434 | Select-Object OwningProcess`);
      const portPids = portStdout
        .split('\n')
        .map(line => line.trim().split(/\s+/).pop())
        .filter(pid => pid && /^\d+$/.test(pid));

      const allPids = [...new Set([...ollamaPids, ...portPids])];

      for (const pid of allPids) {
        try {
          await execAsync(`taskkill /F /PID ${pid}`);
          // console.log(`Killed process ${pid}`);
        } catch (err) {
          // console.warn(`Failed to kill PID ${pid}: ${err.message}`);
        }
      }
    } catch (err) {
      // console.error("Error finding or killing Ollama processes:", err.message);
    }
  } else {
    try {
      await execAsync(`lsof -ti:${OLLAMA_PORT} | xargs kill -9`);
      // console.log("Killed processes using port 11434 (Unix).\n");
    } catch (err) {
      if (!err.message.includes("No such file or directory")) {
        // console.warn("Failed to kill processes on port 11434:", err.message);
      }
    }
  }

  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function startOllama() {
  const ollama = spawn("ollama", ["serve"], { shell: true });


  const waitForOllama = async () => {
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch('http://127.0.0.1:11434/api/tags');
        if (res.ok) {
          const data = await res.json();
          const installed = data.models.map(m => m.name);
          if (!installed.includes(QUERY_MODEL)) {
            console.log(`⏬ Pulling model: ${QUERY_MODEL}`);
            const pull = spawn("ollama", ["pull", QUERY_MODEL], { shell: true });

            pull.stdout.on("data", data => process.stdout.write(data));
            pull.stderr.on("data", data => process.stderr.write(data));

            await new Promise((resolve, reject) => {
              pull.on("close", code => {
                if (code === 0) resolve();
                else reject(`Failed to pull model: ${QUERY_MODEL}`);
              });
            });
          } else {
            // console.log(`✅ Model already available: ${QUERY_MODEL}`);
          }
          return;
        }
      } catch (e) {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    // console.error("❌ Ollama API did not become ready in time.");
  };

  await waitForOllama();

  // Restart serve if it closes
  ollama.on("close", (code) => {
    // console.warn(`Ollama serve exited with code ${code}, restarting...`);
    startOllama();
  });
}


async function startUvicorn() {
  const uvicornProcess = spawn("uvicorn", ["main:app", "--reload", "--port", BACKEND_PORT], { cwd: 'public/backend/' });
  // uvicornProcess.stdout.on("data", (data) => console.log(`[Uvicorn]: ${data}`));
  // uvicornProcess.stderr.on("data", (data) => console.error(`[Uvicorn Error]: ${data}`));
  uvicornProcess.on("close", (code) => {
    // console.log(`Uvicorn process exited with code ${code}`);
    // console.log("Restarting Uvicorn...");
    startUvicorn(); 
  });
}

async function startServices() {
  await killOllamaProcesses();
  await startOllama(); 
  await startUvicorn(); 
}

await startServices();

const app = express();
app.use(cors({ origin: 'http://localhost:5500' }));
app.use(express.json());
app.use(express.static('public'));

app.post('/process', async (req, res) => {
  const userInput = req.body.text;
  if (!userInput) return res.status(400).json({ error: 'No input provided' });

  let contextData = '';
  try {
    const form = new URLSearchParams();
    form.append('question', userInput);
    const contextRes = await fetch(`http://127.0.0.1:${BACKEND_PORT}/query`, {   
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    const contextJson = await contextRes.json();
    contextData = contextJson.context || '';
  } catch (err) {
    console.error("Failed to fetch context from vector DB:", err);
  }

  try {
    // console.log("QUERY_MODEL:", QUERY_MODEL); 
    const ollamaRes = await fetch(`http://127.0.0.1:11434/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: QUERY_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are Personal Buddy, an advanced AI language model developed by .
Your purpose is to provide accurate, clear, and helpful answers to user questions using the context provided.
Always prioritize relevance to the question, and ensure the response is well-organized, direct, and easy to understand.

Use the following context to inform your answer:
${contextData}

If the context is insufficient, respond gracefully and indicate that more information may be needed.`
        },
          { role: 'user', content: userInput }
        ]
      })
    });

    const rawResponse = await ollamaRes.text();
    const lines = rawResponse.split("\n").filter(line => line.trim() !== "");
    let fullResponse = "";
    for (const line of lines) {
      try {
        const jsonObj = JSON.parse(line);
        if (jsonObj?.message?.content) {
          fullResponse += jsonObj.message.content;
        }
      } catch (parseErr) {
        // console.error("Error parsing line:", line, parseErr);
      }
    }

    function formatResponse(text) {
      const thinking = /(<\/think>|\\u003c\/think\\u003e)/i;
      const part = text.split(thinking);
      let normalized = part.length > 1 ? part.slice(2).join('') : text;
      return normalized.replace(/\r\n/g, "\n");
    }

    res.json({ response: formatResponse(fullResponse) });

  } catch (err) {
    // console.error('Error talking to Ollama:', err);
    res.status(500).json({ error: 'Ollama call failed.' });
  }
});

console.log("⏳ Waiting for backend to start...");
setTimeout(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}, 25000);
