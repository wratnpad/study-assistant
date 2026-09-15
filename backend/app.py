import os
os.environ["PYTHONWARNINGS"] = "ignore"
import sys
import json
import warnings
warnings.filterwarnings("ignore")
from langchain_core._api import LangChainDeprecationWarning
warnings.filterwarnings("ignore", category=LangChainDeprecationWarning)

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.config import DB_PATH, DOCS_DIR, DEFAULT_SESSION_ID
from src.memory import get_session_history, clear_session_history
from src.ingest import ingest_pdf_file
from src.retriever import (
    retrieve_context,
    reload_or_update_retriever,
    get_retrievers,
    get_vectorstore_status
)
from src.chains import (
    rag_chain,
    contextualize_q_chain,
    query_rewriter
)

app = FastAPI(
    title="Study Assistant RAG API",
    description="Backend API untuk Study Assistant dengan FastAPI dan LangChain",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.exists(DB_PATH):
    try:
        reload_or_update_retriever()
    except Exception as e:
        print(f"[!] Peringatan saat inisialisasi awal database: {e}")
else:
    print("[!] Peringatan: Direktori database belum ditemukan. Menunggu dokumen diunggah via /api/upload atau di-ingest via ingest.py.")

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Pertanyaan dari pengguna")
    session_id: str = Field(default=DEFAULT_SESSION_ID, description="ID sesi obrolan")

class ResetRequest(BaseModel):
    session_id: str = Field(default=DEFAULT_SESSION_ID, description="ID sesi obrolan yang akan direset")

@app.get("/api/health")
async def health_check():
    ready, total_chunks = get_vectorstore_status()
    return {
        "status": "ok",
        "message": "Study Assistant API is online",
        "database_ready": ready,
        "total_chunks": total_chunks
    }

@app.get("/api/status")
async def get_status():
    ready, total_chunks = get_vectorstore_status()
    return {
        "ready": ready,
        "total_chunks": total_chunks
    }

@app.post("/api/reset")
async def reset_session(req: ResetRequest):
    cleared = clear_session_history(req.session_id)
    return {"status": "ok", "session_id": req.session_id, "cleared": cleared}

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Format file tidak didukung. Harap unggah file berformat .pdf."
        )

    safe_filename = os.path.basename(file.filename)
    os.makedirs(DOCS_DIR, exist_ok=True)
    saved_file_path = os.path.join(DOCS_DIR, safe_filename)

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=400,
                detail="File yang diunggah kosong."
            )

        with open(saved_file_path, "wb") as f:
            f.write(content)

        new_chunks = ingest_pdf_file(saved_file_path)
        reload_or_update_retriever(new_chunks)

        return {
            "status": "success",
            "message": "File berhasil diindeks ke basis pengetahuan.",
            "filename": safe_filename,
            "total_chunks_added": len(new_chunks)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal memproses dan mengindeks file PDF: {str(e)}"
        )

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    FRIENDLY_NO_DOCS_MSG = (
        "⚠️ **Belum ada materi perkuliahan yang diunggah.**\n\n"
        "Silakan unggah berkas modul atau slide kuliah berformat **.pdf** terlebih dahulu dengan menekan tombol **Upload** (ikon ⬆️ di sebelah kiri kotak input pesan), agar saya dapat mempelajari materinya dan menjawab pertanyaanmu sesuai dokumen rujukan."
    )

    async def event_generator():
        try:
            ready, _ = get_vectorstore_status()
            if not ready:
                yield f"data: {json.dumps({'token': FRIENDLY_NO_DOCS_MSG})}\n\n"
                yield "data: [DONE]\n\n"
                return

            bm25_retriever, dense_retriever, hybrid_retriever = get_retrievers()
            if not hybrid_retriever:
                yield f"data: {json.dumps({'token': FRIENDLY_NO_DOCS_MSG})}\n\n"
                yield "data: [DONE]\n\n"
                return

            session_history = get_session_history(req.session_id)

            if session_history.messages:
                try:
                    standalone_question = await contextualize_q_chain.ainvoke({
                        "chat_history": session_history.messages,
                        "question": req.question
                    })
                    standalone_question = standalone_question.strip() if standalone_question else req.question
                except Exception:
                    standalone_question = req.question
            else:
                standalone_question = req.question

            if len(standalone_question.split()) <= 4:
                try:
                    search_query = await query_rewriter.ainvoke({"question": standalone_question})
                    search_query = search_query.strip() if search_query else standalone_question
                except Exception:
                    search_query = standalone_question
            else:
                search_query = standalone_question

            context, docs = retrieve_context(
                user_query=req.question,
                standalone_query=standalone_question,
                search_query=search_query,
                bm25_retriever=bm25_retriever,
                dense_retriever=dense_retriever,
                hybrid_retriever=hybrid_retriever
            )

            async for chunk in rag_chain.astream(
                {"context": context, "question": req.question},
                config={"configurable": {"session_id": req.session_id}}
            ):
                if chunk:
                    payload = json.dumps({"token": chunk})
                    yield f"data: {payload}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as err:
            err_str = str(err).lower()
            if "no such table" in err_str:
                yield f"data: {json.dumps({'token': FRIENDLY_NO_DOCS_MSG})}\n\n"
            else:
                print(f"[!] Error saat streaming chat: {err}")
                err_payload = json.dumps({"error": str(err)})
                yield f"data: {err_payload}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)