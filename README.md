📚 Local RAG-based Chat with File Upload
This project is a simple RAG (Retrieval-Augmented Generation) chatbot interface that:

Lets users upload documents (.pdf, .docx, .pptx, .py, etc.).

Converts documents into a local vector database using FAISS.

Sends user queries to a local LLM (Ollama) along with the best-matching context from the uploaded documents.

🔧 Tech Stack
Frontend: HTML/CSS/JS 

Node.js Backend: Handles chatting with Ollama and manages query flow.

Python Backend (FastAPI): Processes uploaded files and creates a vector database.

LLM: Ollama running models like qwen2.5-coder:7b-instruct

Embedding Model: via HuggingFace

1. 📁 Clone the Repository<br>
bash: git clone https://github.com/Krrish-29/Exam-Buddy.git

2. 📦 Install Node.js<br>
Download and install Node.js from https://nodejs.org/

3. 🐍 Install Python 3.10+<br>
Make sure Python 3.10 or newer is installed

4. 🧠 Install Ollama<br>
Download Ollama from https://ollama.com/download

5. ⚙️ Set Up Environment Variables<br>
Create a .env file from the template:
bash :cd Exam-Buddy
      cp .env.template .env

6. 🔄 Start the Servers<br>
bash : 
      npm install 

      pip install -r requirements.txt

      cd public/backend

      npm run dev

Add model names in the .env using the templete provided (This step is not necessary as base models are already added in the project).
