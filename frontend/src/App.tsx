import { useState, useEffect, useRef, type ChangeEvent, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { PanelLeft, CheckCircle2, AlertCircle, X } from 'lucide-react';
import 'katex/dist/katex.min.css';

import Sidebar from './components/Sidebar.tsx';
import WelcomeHero from './components/WelcomeHero.tsx';
import ChatList from './components/ChatList.tsx';
import ChatInput from './components/ChatInput.tsx';
import ErrorBanner from './components/ErrorBanner.tsx';
import type { Message, ChatSession } from './types.ts';

const API_BASE_URL = 'https://study-assistant-production-48e0.up.railway.app';
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success', duration = 4500) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  };

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
      triggerToast(
        `Berkas "${file.name}" tidak didukung. Harap unggah berkas berformat .pdf.`,
        'error',
        5000
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size === 0) {
      triggerToast(
        `Berkas "${file.name}" kosong (0 byte) dan tidak dapat diproses.`,
        'error',
        5000
      );
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

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorDetail = data?.detail || data?.message || `Gagal memproses dokumen "${file.name}" (Status HTTP ${response.status})`;
        throw new Error(errorDetail);
      }

      triggerToast(
        `Dokumen ${data.filename} berhasil diindeks (${data.total_chunks_added} chunks)!`,
        'success',
        4500
      );
    } catch (err: any) {
      console.error('Error uploading document:', err);
      triggerToast(
        err.message || `Gagal memproses dokumen "${file.name}".`,
        'error',
        5000
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
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
            <span className="text-base sm:text-lg font-bold text-[#e3e3e3] tracking-tight select-none">
              AIssistant
            </span>
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
              }`}
              title={isOnline ? 'Backend Online' : 'Backend Offline'}
            />
          </div>
        </div>
      </header>

      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] sm:w-auto flex items-center justify-between sm:justify-start gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md transition-all animate-slide-down-fade ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/30'
              : 'bg-rose-950/90 text-rose-200 border border-rose-500/30'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium leading-snug break-words">
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className={`ml-2 transition-colors cursor-pointer shrink-0 ${
              toast.type === 'success'
                ? 'text-emerald-400/70 hover:text-emerald-200'
                : 'text-rose-400/70 hover:text-rose-200'
            }`}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

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