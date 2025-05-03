from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.document_loaders import PyPDFLoader, UnstructuredWordDocumentLoader, UnstructuredPowerPointLoader, TextLoader
from langchain_community.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os

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

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

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
    else:
        raise ValueError(f"Unsupported file type: {extension}")

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    ext = os.path.splitext(file.filename)[1]

    with open(file_path, "wb") as f:
        f.write(await file.read())

    try:
        documents = load_document_by_type(file_path, ext)
    except Exception as e:
        return {"error": f"❌ Could not load document: {str(e)}"}

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = text_splitter.split_documents(documents)

    vectorstore = FAISS.from_documents(chunks, embeddings)
    vectorstore.save_local(DB_DIR)

    return {"message": f"✅ {file.filename} uploaded and vector DB saved"}

@app.post("/query")
async def query_llm(question: str = Form(...)):
    if not os.path.exists(DB_DIR):
        return {"error": "❌ Vector DB not found. Upload a document first."}

    vectorstore = FAISS.load_local(DB_DIR, embeddings, allow_dangerous_deserialization=True)
    docs = vectorstore.similarity_search(question, k=3)
    context = "\n\n".join([d.page_content for d in docs])

    return {"context": context}
