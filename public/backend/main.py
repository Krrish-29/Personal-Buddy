from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.document_loaders import PyPDFLoader, UnstructuredWordDocumentLoader, UnstructuredPowerPointLoader, TextLoader
from langchain_community.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os
from PIL import Image
import pytesseract
from langchain.schema import Document
import hashlib
import json
from dotenv import load_dotenv
load_dotenv()
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploaded_docs"
DB_DIR = "vector_db"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DB_DIR, exist_ok=True)

embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)


def load_document_by_type(file_path: str, extension: str):
    extension = extension.lower()
    if extension == ".pdf":
        return PyPDFLoader(file_path).load()
    elif extension in [".doc", ".docx"]:
        return UnstructuredWordDocumentLoader(file_path).load()
    elif extension in [".ppt", ".pptx"]:
        return UnstructuredPowerPointLoader(file_path).load()
    elif extension in [".txt", ".py", ".c", ".cpp", ".java", ".js", ".ts", ".html", ".css"]:
        return TextLoader(file_path).load()
    elif extension in [".png", ".jpg", ".jpeg"]:
        text = pytesseract.image_to_string(Image.open(file_path))
        return [Document(page_content=text)]
    else:
        raise ValueError(f"Unsupported file type: {extension}")

HASH_RECORD_FILE = "file_hashes.json"

# Load existing hashes (if any)
if os.path.exists(HASH_RECORD_FILE):
    with open(HASH_RECORD_FILE, "r") as f:
        uploaded_hashes = json.load(f)
else:
    uploaded_hashes = {}

def calculate_file_hash(file_path):
    """Generate SHA-256 hash for file content."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for block in iter(lambda: f.read(4096), b""):
            sha256.update(block)
    return sha256.hexdigest()

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    ext = os.path.splitext(file.filename)[1]

    with open(file_path, "wb") as f:
        f.write(await file.read())

    file_hash = calculate_file_hash(file_path)

    if file_hash in uploaded_hashes:
        return {"message": f"⚠️ {file.filename} already uploaded. Skipping."}

    try:
        documents = load_document_by_type(file_path, ext)
    except Exception as e:
        return {"error": f"❌ Could not load document: {str(e)}"}

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = text_splitter.split_documents(documents)
    if "bge" in EMBEDDING_MODEL.lower():
        chunks = [Document(page_content="Represent this sentence for retrieval: " + d.page_content) for d in chunks]
    vectorstore = FAISS.from_documents(chunks, embeddings)
    vectorstore.save_local(DB_DIR)

    # Save hash
    uploaded_hashes[file_hash] = file.filename
    with open(HASH_RECORD_FILE, "w") as f:
        json.dump(uploaded_hashes, f)

    return {"message": f"{file.filename} uploaded and DB saved ✅"}


@app.post("/query")
async def query_llm(question: str = Form(...)):
    index_path = os.path.join(DB_DIR, "index.faiss")
    if not os.path.exists(index_path):
        return {"error": "No vector database found. Upload a document first."}
    
    try:
        vectorstore = FAISS.load_local(DB_DIR, embeddings, allow_dangerous_deserialization=True)
        if "bge" in EMBEDDING_MODEL.lower():
            question = "Represent this sentence for retrieval: " + question
        docs = vectorstore.similarity_search(question, k=3)
        context = "\n\n".join([d.page_content for d in docs])
        return {"context": context}
    except Exception as e:
        # Return a JSON error response even if an error occurs
        return {"error": f"Failed to load vector DB: {str(e)}"}