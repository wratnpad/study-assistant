import {
  type RefObject,
  type ChangeEvent,
  type KeyboardEvent,
  type FormEvent,
} from 'react';
import { ArrowUp, Upload, Loader2 } from 'lucide-react';

interface ChatInputProps {
  input: string;
  isStreaming: boolean;
  isUploading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: (e?: FormEvent) => void;
  onTriggerFileInput: () => void;
}

export default function ChatInput({
  input,
  isStreaming,
  isUploading,
  textareaRef,
  onInputChange,
  onKeyDown,
  onSendMessage,
  onTriggerFileInput,
}: ChatInputProps) {
  const hasInput = Boolean(input.trim());

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#131314] border-t border-white/[0.06] p-2 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center">
        <form onSubmit={onSendMessage} className="w-full flex flex-col items-center">
          
          {/* Box Input */}
          <div className="w-full bg-[#1e1f20] focus-within:bg-[#232527] border border-white/10 focus-within:border-white/25 rounded-2xl sm:rounded-3xl shadow-lg p-2 sm:p-3">
            
            {/* Grid Mirror */}
            <div className="relative grid grid-cols-1 items-start max-h-48 overflow-y-auto px-2">
              <div 
                aria-hidden="true"
                className="invisible whitespace-pre-wrap break-words text-[15px] sm:text-[16px] leading-relaxed font-sans col-start-1 row-start-1 pb-1 select-none pointer-events-none"
              >
                {input ? `${input}\n` : 'placeholder'}
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                placeholder="Tanyakan materi kuliah, konsep, atau aturan dokumen..."
                rows={1}
                disabled={isStreaming}
                className="w-full h-full bg-transparent border-0 text-[#e3e3e3] placeholder-[#8e918f] placeholder:text-xs sm:placeholder:text-sm text-[15px] sm:text-[16px] leading-relaxed font-sans resize-none outline-none col-start-1 row-start-1 p-0 block box-border"
              />
            </div>

            {/* Action Bar: tombol terkunci di koordinat masing-masing */}
            <div className="flex items-center mt-2 pt-1 border-t border-white/[0.04]">
              {/* Tombol Upload (Kiri) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onTriggerFileInput}
                  disabled={isStreaming || isUploading}
                  className="flex-none h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center text-[#8e918f] hover:text-white hover:bg-white/10 active:scale-95 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title={isUploading ? "Mengunggah..." : "Unggah PDF (Hanya teks digital, bukan scan/foto)"}
                >
                  {isUploading ? (
                    <Loader2 size={17} className="animate-spin text-neutral-300" />
                  ) : (
                    <Upload size={17} />
                  )}
                </button>
                <span className="text-[11px] text-[#8e918f]/80 select-none hidden sm:inline-block">
                  PDF text-only (bukan scan/foto)
                </span>
              </div>

              {/* Tombol Kirim (Kanan - dikunci dengan ml-auto dan transition-colors saja) */}
              <button
                type="submit"
                disabled={isStreaming || !hasInput || isUploading}
                className={`flex-none ml-auto h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center active:scale-95 transition-colors duration-150 ${
                  hasInput && !isStreaming
                    ? 'bg-white text-black hover:bg-neutral-200 cursor-pointer shadow'
                    : 'bg-white/5 text-[#8e918f] cursor-not-allowed opacity-40'
                }`}
                title={hasInput ? 'Kirim' : 'Ketik pesan'}
              >
                {isStreaming ? (
                  <Loader2 size={17} className="animate-spin text-white" />
                ) : (
                  <ArrowUp size={17} />
                )}
              </button>
            </div>

          </div>

          <p className="text-[11px] text-[#8e918f] text-center mt-2 select-none px-2 leading-relaxed">
            Catatan: Berkas PDF harus berbasis teks (bukan hasil scan/foto). AIssistant dapat membuat kekeliruan.
          </p>
        </form>
      </div>
    </footer>
  );
}