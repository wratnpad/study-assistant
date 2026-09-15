import { Sparkles } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export default function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto max-w-md bg-[#1e1f20] border border-white/20 text-[#e3e3e3] px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xl z-50 animate-slide-down-fade text-center">
      <Sparkles size={16} className="text-white shrink-0" />
      <span className="truncate">{message}</span>
    </div>
  );
}
