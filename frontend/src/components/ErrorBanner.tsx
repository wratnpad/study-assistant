import { AlertCircle } from 'lucide-react';

interface ErrorBannerProps {
  message: string | null;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 max-w-xl w-[92%] sm:w-auto bg-[#1e1f20] border border-white/20 text-[#e3e3e3] px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xl z-50 animate-slide-down-fade text-center">
      <AlertCircle size={16} className="shrink-0 text-neutral-300" />
      <span>{message}</span>
    </div>
  );
}
