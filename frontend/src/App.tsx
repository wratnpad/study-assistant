import { useState, useEffect, useRef, type ChangeEvent, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { PanelLeft } from 'lucide-react';
import 'katex/dist/katex.min.css';

import Sidebar from './components/Sidebar.tsx';
import WelcomeHero from './components/WelcomeHero.tsx';
import ChatList from './components/ChatList.tsx';
import ChatInput from './components/ChatInput.tsx';
import Toast from './components/Toast.tsx';
import ErrorBanner from './components/ErrorBanner.tsx';
import type { Message, ChatSession } from './types.ts';

const API_BASE_URL = 'https://study-assistant-production-626a.up.railway.app';
const SESSIONS_STORAGE_KEY = 'study_assistant_sessions_v1';

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Gagal membaca sessions dari localStorage:', e);
      return [];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => `session_${Date.now()}`);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadToast, setUploadToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Gagal menyimpan sessions ke localStorage:', e);
    }
  }, [sessions]);

  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`);
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };

    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSelectSession = (sessionId: string) => {
    if (isStreaming) return;
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (targetSession) {
      setCurrentSessionId(targetSession.id);
      setMessages(targetSession.messages);
      setIsSidebarOpen(false);
    }
  };

  const handleNewChat = () => {
    if (isStreaming) return;
    const newSessionId = `session_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setInput('');
    setErrorMessage('');
    setIsSidebarOpen(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleDeleteSession = (sessionId: string, e: MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      handleNewChat();
    }
  };

  const handleClearAllSessions = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua riwayat pertanyaan?')) {
      setSessions([]);
      handleNewChat();
    }
  };

  const executeSendMessage = async (textToSend: string) => {
    const trimmedInput = textToSend.trim();
    if (!trimmedInput || isStreaming) return;

    setErrorMessage('');
    const userMsgId = Date.now().toString();
    const botMsgId = (Date.now() + 1).toString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newUserMsg: Message = { id: userMsgId, sender: 'user', text: trimmedInput, timestamp: timeStr };
    const initialBotMsg: Message = { id: botMsgId, sender: 'assistant', text: '', timestamp: timeStr };

    setMessages((prev) => [...prev, newUserMsg, initialBotMsg]);

    setSessions((prev) => {
      const exists = prev.some((s) => s.id === currentSessionId);
      if (!exists) {
        const newSession: ChatSession = {
          id: currentSessionId,
          title: trimmedInput,
          createdAt: Date.now(),
          messages: [newUserMsg, initialBotMsg]
        };
        return [newSession, ...prev];
      } else {
        return prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, newUserMsg, initialBotMsg] }
            : s
        );
      }
    });

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsStreaming(true);

    let accumulatedText = '';

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmedInput,
          session_id: currentSessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Server merespons status ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream tidak didukung pada browser ini.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;

          const dataContent = trimmedLine.slice(5).trim();
          if (dataContent === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataContent);
            if (parsed.token) {
              accumulatedText += parsed.token;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMsgId ? { ...msg, text: accumulatedText } : msg
                )
              );
            } else if (parsed.error) {
              accumulatedText += `\n\n*(Error: ${parsed.error})*`;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMsgId ? { ...msg, text: accumulatedText } : msg
                )
              );
            }
          } catch {
            accumulatedText += dataContent;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId ? { ...msg, text: accumulatedText } : msg
              )
            );
          }
        }
      }
    } catch (error: any) {
      console.error('Error streaming chat:', error);
      accumulatedText =
        '⚠️ Maaf, terjadi kesalahan saat menghubungi server. Pastikan backend FastAPI sedang berjalan di port 8000.';
      setErrorMessage(`Gagal terhubung ke backend: ${error.message}`);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId && msg.text === ''
            ? { ...msg, text: accumulatedText }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === botMsgId ? { ...m, text: accumulatedText } : m
                )
              }
            : s
        )
      );

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleSendMessage = (e?: FormEvent) => {
    e?.preventDefault();
    executeSendMessage(input);
  };

  const triggerFileInput = () => {
    if (isUploading || isStreaming) return;
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Hanya file dokumen berformat .pdf yang diperbolehkan.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || `Status HTTP ${response.status}`);
      }

      setUploadToast(`Berkas ${data.filename} berhasil diindeks (${data.total_chunks_added} chunks)!`);
      setTimeout(() => setUploadToast(null), 5000);

      const notificationMsg: Message = {
        id: Date.now().toString(),
        sender: 'assistant',
        text: `📄 **Dokumen Berhasil Diindeks!**\n\nBerkas **${data.filename}** telah berhasil di-chunk dan diindeks ke dalam vectorstore & BM25 (${data.total_chunks_added} potongan teks). Anda sekarang dapat langsung menanyakan materi dari dokumen ini!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, notificationMsg]);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, notificationMsg] }
            : s
        )
      );
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setErrorMessage(`Gagal mengunggah dokumen: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-full bg-[#131314] text-[#e3e3e3] overflow-hidden relative font-sans">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
      />

      <header className="fixed top-0 left-0 right-0 h-13 sm:h-16 px-3.5 sm:px-6 pt-[env(safe-area-inset-top)] flex items-center justify-between z-30 pointer-events-none animate-slide-down-fade">
        <div className="flex items-center gap-2 pointer-events-auto">
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              title="Buka Riwayat Pertanyaan"
              className="p-2 sm:p-2.5 rounded-full bg-[#1e1f20] hover:bg-white/10 active:bg-white/20 border border-white/10 text-neutral-400 hover:text-white transition-all shadow-md cursor-pointer"
            >
              <PanelLeft size={18} />
            </button>
          )}
          <div className="flex items-center gap-2 ml-1">
            <span className="text-sm sm:text-base font-semibold text-[#e3e3e3] tracking-tight select-none">
              Study Assistant
            </span>
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
              }`}
              title={isOnline ? 'Backend Online (Port 8000)' : 'Backend Offline (Port 8000)'}
            />
          </div>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      <Toast message={uploadToast} />
      <ErrorBanner message={errorMessage} />

      <main className="flex-1 overflow-y-auto flex flex-col px-3 sm:px-5 pt-14 sm:pt-20 pb-28 sm:pb-36 relative">
        {messages.length === 0 ? (
          <WelcomeHero onSelectSuggestion={executeSendMessage} />
        ) : (
          <ChatList messages={messages} messagesEndRef={messagesEndRef} />
        )}
      </main>

      <ChatInput
        input={input}
        isStreaming={isStreaming}
        isUploading={isUploading}
        textareaRef={textareaRef}
        onInputChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSendMessage={handleSendMessage}
        onTriggerFileInput={triggerFileInput}
      />
    </div>
  );
}
