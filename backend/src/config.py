import os

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SRC_DIR)
DOCS_DIR = os.path.join(ROOT_DIR, "data", "documents")
DB_PATH = os.path.join(ROOT_DIR, "storage", "chroma_db")

try:
    from dotenv import load_dotenv
    env_file = os.path.join(ROOT_DIR, ".env")
    load_dotenv(dotenv_path=env_file)
except ImportError:
    pass

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("PORT", os.getenv("API_PORT", 8000)))

FRONTEND_URL = os.getenv("FRONTEND_URL", "")
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://study-assistant-production-48e0.up.railway.app/"
]
if FRONTEND_URL:
    CORS_ORIGINS.append(FRONTEND_URL)

LLM_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
LLM_TEMPERATURE = 0.0
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "models/gemini-embedding-2")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

CHROMA_COLLECTION_NAME = "academic_rag"

RETRIEVER_K = int(os.getenv("RETRIEVER_K", 4))
RRF_DENSE_WEIGHT = 0.6
RRF_BM25_WEIGHT = 0.4

DEFAULT_SESSION_ID = "session_1"

STOPWORDS_QUERY = {
    "apa", "apakah", "itu", "ini", "yang", "di", "ke", "dari", "dan", "atau",
    "adalah", "tentang", "jelaskan", "bagaimana", "mengapa", "kenapa", "sebutkan",
    "artinya", "maksud", "pengertian", "definisi", "tolong", "bisa"
}