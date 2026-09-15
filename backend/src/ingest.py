import os
import sys
import glob
from pypdf import PdfReader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from src.config import (
    DOCS_DIR,
    DB_PATH,
    EMBEDDING_MODEL,
    GOOGLE_API_KEY,
    CHROMA_COLLECTION_NAME,
)

def get_embedding_function() -> GoogleGenerativeAIEmbeddings:
    if not GOOGLE_API_KEY:
        raise ValueError(
            "GOOGLE_API_KEY belum disetel di environment atau file .env!"
        )
    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=GOOGLE_API_KEY,
        task_type="retrieval_document",
    )

def get_vector_store() -> Chroma:
    os.makedirs(DB_PATH, exist_ok=True)
    return Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        persist_directory=DB_PATH,
        embedding_function=get_embedding_function(),
    )

def process_single_pdf(pdf_path: str) -> list[Document]:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File PDF tidak ditemukan: {pdf_path}")

    file_name = os.path.basename(pdf_path)
    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)

    if total_pages == 0:
        return []

    page_docs = []
    total_chars = 0
    for idx, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            clean_text = "\n".join(lines)
            doc = Document(
                page_content=clean_text,
                metadata={"source": file_name, "page": idx + 1},
            )
            page_docs.append(doc)
            total_chars += len(clean_text)

    if not page_docs:
        print(f"[!] File {file_name} tidak memiliki teks digital yang terbaca.")
        return []

    avg_chars_per_page = total_chars / len(page_docs)

    if avg_chars_per_page < 800:
        print(f"[*] {file_name} ({total_pages} hal) -> SLIDE / MODUL RINGKAS (1 hal = 1 chunk)")
        return page_docs
    else:
        print(f"[*] {file_name} ({total_pages} hal) -> DOKUMEN TEBAL (Adaptive Chunking)")
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=900,
            chunk_overlap=150,
            separators=["\n\n", "\n", ". ", " "],
        )
        return splitter.split_documents(page_docs)

def ingest_pdf_file(file_path: str) -> list[Document]:
    chunks = process_single_pdf(file_path)
    if not chunks:
        raise ValueError(
            f"File '{os.path.basename(file_path)}' tidak memiliki teks yang dapat diekstrak."
        )

    vectorstore = get_vector_store()

    file_name = os.path.basename(file_path)
    ids = [
        f"{file_name}_p{d.metadata.get('page', 1)}_{idx}"
        for idx, d in enumerate(chunks)
    ]

    vectorstore.add_documents(documents=chunks, ids=ids)
    print(f"[✓] Berhasil menambahkan {len(chunks)} chunk dari {file_name} ke ChromaDB.")
    return chunks

def run_ingest():
    pdf_files = glob.glob(os.path.join(DOCS_DIR, "*.pdf"))
    txt_files = glob.glob(os.path.join(DOCS_DIR, "*.txt"))

    if not pdf_files and not txt_files:
        print(f"[!] Tidak ada file (.pdf / .txt) ditemukan di {DOCS_DIR}")
        return

    all_chunks = []

    for pdf_file in pdf_files:
        chunks = process_single_pdf(pdf_file)
        all_chunks.extend(chunks)

    for txt_file in txt_files:
        file_name = os.path.basename(txt_file)
        with open(txt_file, "r", encoding="utf-8") as f:
            raw_text = f.read()
        txt_splitter = RecursiveCharacterTextSplitter(
            chunk_size=700,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", " "],
        )
        chunks = txt_splitter.split_documents([
            Document(page_content=raw_text, metadata={"source": file_name, "page": 1})
        ])
        all_chunks.extend(chunks)

    if not all_chunks:
        print("[!] Tidak ada potongan teks yang siap disimpan.")
        return

    print(f"\n[*] Total {len(all_chunks)} potongan teks berhasil disiapkan.")
    print(f"[*] Menyimpan ke ChromaDB via Google Embeddings ({EMBEDDING_MODEL})...")

    vectorstore = get_vector_store()
    ids = [
        f"{c.metadata.get('source', 'doc')}_p{c.metadata.get('page', 1)}_{i}"
        for i, c in enumerate(all_chunks)
    ]
    vectorstore.add_documents(documents=all_chunks, ids=ids)

    print("[✓] Ingestion selesai! Database siap melayani tanya jawab.")

if __name__ == "__main__":
    run_ingest()