import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { exec } from "child_process";

exec("ollama run qwen2.5-coder:7b-instruct", (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Standard Error: ${stderr}`);
    return;
  }
});

const app = express();

app.use(cors({ origin: 'http://localhost:5500' }));
app.use(express.json());
app.use(express.static('public'));

//example db
const db = {
  ipu: "IPU (Indraprastha University) is a public university in Delhi.",
  info: "General information about our services can be found on our site.",
  about: "This platform provides college-related resources and guidance.",
  krrish:"krrish is a student of ggsipu of btech cse ds of sem 2 and got 9.2 cgpa in sem 1."
};

// Endpoint handling user request
app.post('/process', async (req, res) => {
  const userInput = req.body.text;

  if (!userInput) {
    return res.status(400).json({ error: 'No input provided' });
  }

  // Keywords
  const keywords = ['ipu', 'info', 'about','krrish'];
  const matched = keywords.filter(word => userInput.includes(word));

  //if any keyword is present in db matched keywords
  const contextData = matched.map(k => db[k]).join(' ');

  // Send context + user input to Ollama
  try {
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:7b-instruct',
        messages: [
          { role: 'system', content: `Use this background: ${contextData}` },
          { role: 'user', content: userInput }
        ]
      })
    });

    const rawResponse = await ollamaRes.text();
    console.log('Raw Response from Ollama:', rawResponse);

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

    res.json({ response: fullResponse });

  } catch (err) {
    console.error('Error talking to Ollama:', err);
    res.status(500).json({ error: 'Ollama call failed.' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
