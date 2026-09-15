import type { MouseEvent } from 'react';
import { PanelLeftClose, Plus, MessageSquare, Trash2, Clock } from 'lucide-react';
import GeminiStarIcon from './GeminiStarIcon.tsx';
import type { ChatSession } from '../types.ts';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: MouseEvent) => void;
  onClearAllSessions: () => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearAllSessions
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 cursor-pointer"
          aria-label="Tutup Riwayat Sidebar"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full h-[100dvh] w-[82vw] max-w-[320px] sm:w-80 bg-[#18191a] border-r border-white/10 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3.5 sm:p-4 pt-[max(0.875rem,env(safe-area-inset-top))] border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GeminiStarIcon size={20} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] shrink-0" />
              <span className="text-sm font-semibold text-[#e3e3e3] tracking-tight">
                Study Assistant
              </span>
            </div>

            <button
              type="button"
              onClick={onToggle}
              title="Tutup riwayat"
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={onNewChat}
            className="mt-4 flex items-center justify-between w-full px-3.5 py-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 text-[#e3e3e3] hover:text-white transition-all text-xs sm:text-sm font-medium group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-neutral-200 group-hover:rotate-90 transition-transform duration-200" />
              <span>Percakapan Baru</span>
            </div>
            <span className="text-[10px] text-neutral-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/5">
              Baru
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between px-4 pt-3.5 pb-1 text-neutral-400 text-xs font-semibold tracking-wider uppercase">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-neutral-500" />
            <span>Riwayat Pertanyaan</span>
          </div>
          {sessions.length > 0 && (
            <span className="text-[10px] text-neutral-500 font-normal">
              {sessions.length} obrolan
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center mb-2.5">
                <MessageSquare className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-xs text-neutral-300 font-medium">Belum ada riwayat pertanyaan</p>
              <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                Pertanyaan yang pernah kamu tanyakan akan tersimpan dan tampil di sini.
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer text-xs sm:text-sm transition-all border ${
                    isActive
                      ? 'bg-white/10 text-white font-medium border-white/15 shadow-sm'
                      : 'text-neutral-300 hover:bg-white/[0.05] hover:text-white border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <MessageSquare
                      size={15}
                      className={`shrink-0 ${
                        isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'
                      }`}
                    />
                    <span className="truncate leading-tight">
                      {session.title || 'Percakapan baru'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => onDeleteSession(session.id, e)}
                    title="Hapus riwayat ini"
                    className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 text-neutral-400 hover:text-white transition-all shrink-0 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {sessions.length > 0 && (
          <div className="p-3 border-t border-white/10 bg-[#161718]/80">
            <button
              type="button"
              onClick={onClearAllSessions}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10 font-medium cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Bersihkan Semua Riwayat</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

