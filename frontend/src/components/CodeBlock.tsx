import { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  code: string;
}

export default function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Gagal menyalin kode ke clipboard:', err);
    }
  };

  const displayLanguage = (language || 'code').replace(/^language-/, '');

  return (
    <div className="rounded-xl border border-white/10 bg-[#161718] overflow-hidden my-3.5 shadow-xl">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#1e1f20] border-b border-white/10 text-xs text-neutral-400">
        <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-neutral-300">
          <Terminal size={13} className="text-neutral-400" />
          <span>{displayLanguage}</span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Salin kode ke clipboard"
        >
          {copied ? (
            <>
              <Check size={12} className="text-white" />
              <span className="text-white">Tersalin!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>

      <pre className="p-4 overflow-x-auto font-mono text-xs sm:text-[13px] leading-relaxed text-[#e3e3e3] bg-[#161718] selection:bg-white/20">
        <code>{code}</code>
      </pre>
    </div>
  );
}

