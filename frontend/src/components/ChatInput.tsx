import { useState, useEffect, type RefObject, type ChangeEvent, type KeyboardEvent, type FormEvent } from 'react';
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
  onTriggerFileInput
}: ChatInputProps) {
  const hasInput = Boolean(input.trim());
  const [isMultiLine, setIsMultiLine] = useState<boolean>(false);

  useEffect(() => {
    if (!input) {
      setIsMultiLine(false);
      return;
    }
    const hasNewline = input.includes('\n');
    const exceedsHeight = Boolean(textareaRef.current && textareaRef.current.scrollHeight > 44);
    setIsMultiLine(hasNewline || exceedsHeight);
  }, [input, textareaRef]);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const hasNewline = e.target.value.includes('\n');
    const exceedsHeight = e.target.scrollHeight > 44;
    setIsMultiLine(hasNewline || exceedsHeight);
    onInputChange(e);
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] sm:pb-4 bg-gradient-to-t from-[#131314] via-[#131314]/95 to-transparent pointer-events-none z-40">
      <div className="max-w-3xl mx-auto w-full pointer-events-auto flex flex-col items-center px-1 sm:px-0 animate-slide-up-fade animate-delay-200">
        <form onSubmit={onSendMessage} className="w-full flex flex-col items-center">
          <div
            className={`w-full flex flex-wrap items-center bg-[#1e1f20] hover:bg-[#232527] focus-within:bg-[#232527] border border-white/10 focus-within:border-white/20 rounded-xl shadow-2xl transition-all duration-200 ${
              isMultiLine ? 'p-2.5 sm:p-3.5' : 'px-2.5 py-1.5 sm:px-3 sm:py-2'
            }`}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextChange}
              onKeyDown={onKeyDown}
              placeholder="Tanyakan materi kuliah, konsep, atau aturan dokumen..."
              rows={1}
              disabled={isStreaming}
              className={`bg-transparent border-0 text-[#e3e3e3] placeholder-[#8e918f] placeholder:text-xs sm:placeholder:text-sm placeholder:truncate text-[16px] sm:text-[0.95rem] resize-none outline-none leading-normal font-sans transition-all duration-150 ${
                isMultiLine
                  ? 'order-1 w-full pb-2.5 px-1 max-h-36 sm:max-h-40 leading-relaxed'
                  : 'order-2 flex-1 py-1 px-2 sm:px-3 max-h-32 sm:max-h-36'
              }`}
            />

            <div
              className={
                isMultiLine
                  ? 'order-2 w-full h-px bg-white/[0.06] mb-1.5 sm:mb-2'
                  : 'hidden'
              }
            />

            <button
              type="button"
              onClick={onTriggerFileInput}
              disabled={isStreaming || isUploading}
              className={`rounded-lg flex items-center justify-center text-[#8e918f] hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-150 shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isMultiLine ? 'order-3 w-8 h-8' : 'order-1 w-8 h-8 sm:w-9 sm:h-9'
              }`}
              title={isUploading ? "Sedang mengunggah dokumen..." : "Unggah Dokumen PDF"}
            >
              {isUploading ? (
                <Loader2 size={16} className="animate-spin text-neutral-300" />
              ) : (
                <Upload size={16} />
              )}
            </button>

            <div className={isMultiLine ? 'order-4 flex-1' : 'hidden'} />

            <button
              type="submit"
              disabled={isStreaming || !hasInput || isUploading}
              className={`rounded-lg flex items-center justify-center transition-all duration-200 shrink-0 active:scale-95 group ${
                isMultiLine ? 'order-5 w-8 h-8' : 'order-3 w-8 h-8 sm:w-9 sm:h-9'
              } ${
                hasInput && !isStreaming
                  ? 'bg-[#e3e3e3] hover:bg-white text-[#131314] hover:scale-105 shadow-md cursor-pointer'
                  : 'text-[#8e918f] bg-transparent cursor-not-allowed opacity-40'
              }`}
              title={hasInput ? 'Kirim pesan' : 'Ketik pesan'}
            >
              {isStreaming ? (
                <Loader2 size={16} className="animate-spin text-[#e3e3e3]" />
              ) : (
                <ArrowUp
                  size={16}
                  className="transition-transform duration-300 ease-out group-hover:rotate-90 group-hover:translate-x-0.5"
                />
              )}
            </button>
          </div>

          <p className="text-[10px] sm:text-[11px] text-[#8e918f] text-center mt-1.5 sm:mt-2 select-none px-2 truncate max-w-full">
            Study Assistant dapat membuat kekeliruan. Selalu verifikasi materi pada slide asli.
          </p>
        </form>
      </div>
    </footer>
  );
}
