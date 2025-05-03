import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { spawn } from "child_process";
import dotenv from 'dotenv';
dotenv.config();
const QUERY_MODEL = process.env.QUERY_MODEL || "qwen2.5-coder:7b-instruct";

const ollama = spawn("ollama", ["run", QUERY_MODEL]);
// ollama.stdout.on("data", (data) => {
//   console.log(`[Ollama STDOUT]: ${data}`);
// });

// ollama.stderr.on("data", (data) => {
//   console.error(`[Ollama STDERR]: ${data}`);
// });

// ollama.on("close", (code) => {
//   console.log(`Ollama process exited with code ${code}`);
// });
const uvicornProcess = spawn("uvicorn", ["main:app", "--reload", "--port", "5000"],{cwd:'public/backend/'});

// uvicornProcess.stdout.on("data", (data) => {
//   console.log(`[Uvicorn STDOUT]: ${data}`);
// });

// uvicornProcess.stderr.on("data", (data) => {
//   console.error(`[Uvicorn STDERR]: ${data}`);
// });

// uvicornProcess.on("close", (code) => {
//   console.log(`Uvicorn process exited with code ${code}`);
// });

const app = express();

app.use(cors({ origin: 'http://localhost:5500' }));
app.use(express.json());
app.use(express.static('public'));


// Endpoint handling user request
app.post('/process', async (req, res) => {
  const userInput = req.body.text;

  if (!userInput) {
    return res.status(400).json({ error: 'No input provided' });
  }

  
// Ask Python backend for best context
  let contextData = '';
  // console.log("Sending query to FastAPI:", userInput);
  try {
    const form = new URLSearchParams();
    form.append('question', userInput);
    const contextRes = await fetch('http://127.0.0.1:5000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
    });
    const contextJson = await contextRes.json();
    contextData = contextJson.context || '';
  } catch (err) {
    console.error("Failed to fetch context from vector DB:", err);
  }

  // Send context + user input to Ollama
  try {
    const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:7b-instruct',
        messages: [
          { role: 'system', content: `Use this context for answering the user query: ${contextData}` },
          { role: 'user', content: userInput }
        ]
      })
    });

    const rawResponse = await ollamaRes.text();
    // console.log('Raw Response from Ollama:', rawResponse);

    // Split the streaming response 
    const lines = rawResponse.split("\n").filter(line => line.trim() !== "");
    let fullResponse = "";
    for (const line of lines) {
      try {
        const jsonObj = JSON.parse(line);
        if (jsonObj && jsonObj.message && typeof jsonObj.message.content === "string") {
          fullResponse += jsonObj.message.content;
        }
      } catch (parseErr) {
        console.error("Error parsing line:", line, parseErr);
      }
    }
    function formatResponse(text) {
      let normalized = text.replace(/\r\n/g, "\n");
      return normalized;
    }
    res.json({ response: formatResponse(fullResponse) });

  } catch (err) {
    console.error('Error talking to Ollama:', err);
    res.status(500).json({ error: 'Ollama call failed.' });
  }
});

const PORT = 5500;

console.log("⏳ Waiting for backend to start...");

setTimeout(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}, 25000);

