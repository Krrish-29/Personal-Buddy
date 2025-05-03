📚 Local RAG-based Chat with File Upload
This project is a simple RAG (Retrieval-Augmented Generation) chatbot interface that:

Lets users upload documents (.pdf, .docx, .pptx, .py, etc.).

Converts documents into a local vector database using FAISS.

Sends user queries to a local LLM (Ollama) along with the best-matching context from the uploaded documents.

🔧 Tech Stack
Frontend: HTML/CSS/JS (Vanilla)

Node.js Backend: Handles chatting with Ollama and manages query flow.

Python Backend (FastAPI): Processes uploaded files and creates a vector database.

LLM: Ollama running models like qwen2.5-coder:7b-instruct

Embedding Model: all-MiniLM-L6-v2 via HuggingFace

1. Install Node.js from https://nodejs.org
bash : npm install 
2. Install Python 3.10+ 
bash : pip install -r requirements.txt
3. Install Ollama from https://ollama.com/download