import os
import warnings
from typing import Callable, Optional
from langchain_core._api import LangChainDeprecationWarning
warnings.filterwarnings("ignore", category=LangChainDeprecationWarning)
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

from src.config import LLM_MODEL, LLM_TEMPERATURE, GROQ_API_KEY
from src.prompts import (
    contextualize_q_prompt,
    query_expansion_prompt,
    rag_prompt
)

def init_llm(
    model: str = LLM_MODEL,
    temperature: float = LLM_TEMPERATURE,
    api_key: Optional[str] = None,
    streaming: bool = True
) -> ChatGroq:
    groq_api_key = api_key or os.getenv("GROQ_API_KEY") or GROQ_API_KEY
    return ChatGroq(
        model=model,
        groq_api_key=groq_api_key,
        temperature=temperature,
        streaming=streaming
    )

def build_contextualize_chain(llm: ChatGroq):
    return contextualize_q_prompt | llm | StrOutputParser()

def build_query_rewriter(llm: ChatGroq):
    return query_expansion_prompt | llm | StrOutputParser()

def build_rag_chain_with_history(
    llm: ChatGroq,
    session_history_fn: Callable[[str], BaseChatMessageHistory]
) -> RunnableWithMessageHistory:
    rag_chain_base = rag_prompt | llm | StrOutputParser()
    return RunnableWithMessageHistory(
        rag_chain_base,
        session_history_fn,
        input_messages_key="question",
        history_messages_key="chat_history"
    )

from src.memory import get_session_history

llm = init_llm()
contextualize_q_chain = build_contextualize_chain(llm)
query_rewriter = build_query_rewriter(llm)
rag_chain = build_rag_chain_with_history(llm, get_session_history)
