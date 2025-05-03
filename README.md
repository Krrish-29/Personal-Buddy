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

Embedding Model: via HuggingFace

1. Install Node.js
Download and install Node.js from the official website:
👉 https://nodejs.org

Then install the required Node.js packages:

bash
Copy
Edit
npm install
2. Install Python 3.10+
Ensure Python 3.10 or higher is installed. You can check your version with:

bash
Copy
Edit
python --version
Then, install the Python dependencies:

bash
Copy
Edit
pip install -r requirements.txt
3. Install Ollama
Download and install Ollama from the official website:
👉 https://ollama.com/download

4. Clone the Repository and Start the App
bash
Copy
Edit
git clone 
cd project
npm run dev

Add model names in the .env using the templete provided (This step is not necessary as base models are already added in the project).