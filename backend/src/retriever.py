import os
import re
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_classic.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever

from src.config import (
    DB_PATH,
    EMBEDDING_MODEL,
    GOOGLE_API_KEY,
    CHROMA_COLLECTION_NAME,
    RETRIEVER_K,
    RRF_DENSE_WEIGHT,
    RRF_BM25_WEIGHT,
    STOPWORDS_QUERY
)

def bm25_preprocess(text: str) -> list[str]:
    return re.findall(r'\w+', text.lower())

def get_embedding_function():
    api_key = os.getenv("GOOGLE_API_KEY") or GOOGLE_API_KEY
    if api_key:
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            return GoogleGenerativeAIEmbeddings(
                model=EMBEDDING_MODEL,
                google_api_key=api_key,
                task_type="retrieval_query",
            )
        except Exception as e:
            print(f"[!] Info: Gagal memuat GoogleGenerativeAIEmbeddings: {e}")

    from langchain_ollama import OllamaEmbeddings
    return OllamaEmbeddings(model=EMBEDDING_MODEL)

def init_vectorstore(db_path: str = DB_PATH) -> Chroma:
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database ChromaDB tidak ditemukan di: {db_path}")

    embeddings = get_embedding_function()
    return Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        persist_directory=db_path,
        embedding_function=embeddings
    )

_vectorstore = None
_bm25_retriever = None
_dense_retriever = None
_hybrid_retriever = None

def init_retrievers(vectorstore: Chroma, k: int = RETRIEVER_K):
    global _vectorstore, _bm25_retriever, _dense_retriever, _hybrid_retriever
    _vectorstore = vectorstore

    try:
        raw_data = vectorstore.get()
    except Exception as e:
        print(f"[!] Info: Data koleksi ChromaDB belum terbentuk atau kosong: {e}")
        _bm25_retriever = None
        _dense_retriever = None
        _hybrid_retriever = None
        return None, None, None

    extracted_docs = []
    if raw_data and raw_data.get("documents"):
        docs_list = raw_data["documents"]
        metas_list = raw_data.get("metadatas") or [{}] * len(docs_list)
        for doc_text, meta in zip(docs_list, metas_list):
            extracted_docs.append(Document(page_content=doc_text, metadata=meta or {}))

    if extracted_docs:
        _dense_retriever = vectorstore.as_retriever(search_kwargs={"k": k})
        _bm25_retriever = BM25Retriever.from_documents(
            extracted_docs,
            preprocess_func=bm25_preprocess
        )
        _bm25_retriever.k = k

        _hybrid_retriever = EnsembleRetriever(
            retrievers=[_bm25_retriever, _dense_retriever],
            weights=[RRF_BM25_WEIGHT, RRF_DENSE_WEIGHT]
        )
    else:
        _bm25_retriever = None
        _dense_retriever = None
        _hybrid_retriever = None

    return _bm25_retriever, _dense_retriever, _hybrid_retriever

def reload_or_update_retriever(new_docs: list[Document] = None):
    global _vectorstore, _bm25_retriever, _dense_retriever, _hybrid_retriever

    if not os.path.exists(DB_PATH):
        _vectorstore = None
        _bm25_retriever = None
        _dense_retriever = None
        _hybrid_retriever = None
        return None, None, None

    try:
        _vectorstore = init_vectorstore(DB_PATH)
        return init_retrievers(_vectorstore, k=RETRIEVER_K)
    except Exception as e:
        print(f"[!] Info: Basis data vektor belum siap: {e}")
        _vectorstore = None
        _bm25_retriever = None
        _dense_retriever = None
        _hybrid_retriever = None
        return None, None, None

def get_retrievers():
    global _bm25_retriever, _dense_retriever, _hybrid_retriever
    if _hybrid_retriever is None:
        reload_or_update_retriever()
    return _bm25_retriever, _dense_retriever, _hybrid_retriever

def get_vectorstore_status() -> tuple[bool, int]:
    global _vectorstore, _hybrid_retriever
    try:
        if not os.path.exists(DB_PATH):
            return False, 0

        if _hybrid_retriever is None:
            reload_or_update_retriever()

        if _vectorstore is None or _hybrid_retriever is None:
            return False, 0

        raw_data = _vectorstore.get()
        if not raw_data or not raw_data.get("ids"):
            return False, 0

        total_chunks = len(raw_data["ids"])
        return total_chunks > 0, total_chunks
    except Exception as e:
        print(f"[!] Info saat memeriksa status vectorstore: {e}")
        return False, 0

def retrieve_context(
    user_query: str,
    standalone_query: str,
    search_query: str,
    bm25_retriever,
    dense_retriever,
    hybrid_retriever,
    k: int = RETRIEVER_K
) -> tuple[str, list[Document]]:
    core_words = [w for w in standalone_query.split() if w.lower() not in STOPWORDS_QUERY]
    keyword_focus = " ".join(core_words) if core_words else standalone_query

    dense_words = [w for w in search_query.split() if w.lower() not in STOPWORDS_QUERY]
    dense_clean_query = f"{keyword_focus} {' '.join(dense_words)}".strip() if dense_words else search_query

    final_bm25_query = f"{keyword_focus} {standalone_query.upper()} {standalone_query.lower()} {dense_clean_query}".strip()

    if bm25_retriever:
        bm25_docs = bm25_retriever.invoke(final_bm25_query)
        dense_docs = dense_retriever.invoke(dense_clean_query)

        rrf_scores = {}
        doc_map = {}

        seen_dense = set()
        for rank, doc in enumerate(dense_docs):
            key = (doc.metadata.get("source"), doc.metadata.get("page"))
            if key not in seen_dense:
                seen_dense.add(key)
                if key not in doc_map:
                    doc_map[key] = doc
                rrf_scores[key] = rrf_scores.get(key, 0.0) + RRF_DENSE_WEIGHT / (60 + rank)

        seen_bm25 = set()
        for rank, doc in enumerate(bm25_docs):
            key = (doc.metadata.get("source"), doc.metadata.get("page"))
            if key not in seen_bm25:
                seen_bm25.add(key)
                if key not in doc_map:
                    doc_map[key] = doc
                rrf_scores[key] = rrf_scores.get(key, 0.0) + RRF_BM25_WEIGHT / (60 + rank)

        sorted_keys = sorted(rrf_scores.keys(), key=lambda key: rrf_scores[key], reverse=True)
        docs = [doc_map[key] for key in sorted_keys][:k]
    else:
        docs = hybrid_retriever.invoke(final_bm25_query)[:k]

    formatted_chunks = []
    for i, doc in enumerate(docs, 1):
        file_src = doc.metadata.get("source", "dokumen")
        page_num = doc.metadata.get("page", "-")
        formatted_chunks.append(
            f"--- [DOKUMEN RUJUKAN #{i} | Sumber: {file_src} | Halaman: {page_num}] ---\n{doc.page_content}"
        )
    context = "\n\n".join(formatted_chunks)

    return context, docs
