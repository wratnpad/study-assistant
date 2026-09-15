from langchain_core.chat_history import InMemoryChatMessageHistory, BaseChatMessageHistory

chat_history_store: dict[str, InMemoryChatMessageHistory] = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in chat_history_store:
        chat_history_store[session_id] = InMemoryChatMessageHistory()
    return chat_history_store[session_id]

def clear_session_history(session_id: str) -> bool:
    if session_id in chat_history_store:
        chat_history_store[session_id].clear()
        return True
    return False
