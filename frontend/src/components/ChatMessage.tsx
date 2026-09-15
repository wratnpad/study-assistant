import { createContext, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import GeminiStarIcon from './GeminiStarIcon.tsx';
import CodeBlock from './CodeBlock.tsx';
import type { Message } from '../types.ts';

interface ChatMessageProps {
  message: Message;
}

const InPreContext = createContext<boolean>(false);

function normalizeLaTeX(text: string): string {
  if (!text) return '';

  const segments = text.split(/(```[\s\S]*?```|`[^`\n]+`)/g);

  return segments
    .map((segment) => {
      if (segment.startsWith('`')) {
        return segment;
      }

      let normalized = segment.replace(/\\\[([\s\S]*?)\\\]/g, (_match, math) => {
        return `\n$$\n${math.trim()}\n$$\n`;
      });

      normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => {
        return `$${math.trim()}$`;
      });

      return normalized;
    })
    .join('');
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end w-full animate-slide-up-fade">
        <div className="bg-[#282a2c] text-[#e3e3e3] px-3.5 py-2 sm:px-5 sm:py-3 rounded-[18px] sm:rounded-[22px] text-sm sm:text-base leading-relaxed max-w-[90%] sm:max-w-[75%] shadow-sm break-words whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    );
  }

  const processedText = normalizeLaTeX(message.text || '');

  return (
    <div className="flex items-start gap-2.5 sm:gap-4 w-full animate-slide-up-fade">
      <div className="shrink-0 mt-0.5 sm:mt-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">
        <div className="sm:hidden">
          <GeminiStarIcon size={20} />
        </div>
        <div className="hidden sm:block">
          <GeminiStarIcon size={24} />
        </div>
      </div>

      <div className="flex-1 min-w-0 text-[#e3e3e3] text-sm sm:text-base leading-relaxed overflow-hidden">
        {message.text ? (
          <div className="space-y-2.5 sm:space-y-3">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p({ children }) {
                  return <p className="mb-2.5 sm:mb-3.5 last:mb-0 leading-relaxed text-[#e3e3e3]">{children}</p>;
                },
                h1({ children }) {
                  return <h1 className="text-lg sm:text-2xl font-semibold text-white mt-4 sm:mt-5 mb-2">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="text-base sm:text-xl font-semibold text-white mt-3 sm:mt-4 mb-1.5">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-sm sm:text-lg font-semibold text-white mt-2.5 sm:mt-3 mb-1">{children}</h3>;
                },
                ul({ children }) {
                  return <ul className="list-disc ml-4 sm:ml-5 mb-2.5 sm:mb-3.5 space-y-1 text-[#e3e3e3]">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal ml-4 sm:ml-5 mb-2.5 sm:mb-3.5 space-y-1 text-[#e3e3e3]">{children}</ol>;
                },
                li({ children }) {
                  return <li className="leading-relaxed">{children}</li>;
                },
                strong({ children }) {
                  return <strong className="font-semibold text-white">{children}</strong>;
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-2 border-zinc-400 pl-3.5 my-3 text-zinc-300 italic">
                      {children}
                    </blockquote>
                  );
                },
                pre({ children }) {
                  return <InPreContext.Provider value={true}>{children}</InPreContext.Provider>;
                },
                code({ className, children, ...props }: any) {
                  const inPre = useContext(InPreContext);
                  const match = /language-(\w+)/.exec(className || '');
                  const content = String(children ?? '').replace(/\n$/, '');

                  if (inPre) {
                    return <CodeBlock language={match ? match[1] : undefined} code={content} />;
                  }

                  return (
                    <code
                      className="bg-white/10 text-neutral-200 px-1.5 py-0.5 rounded text-[0.88em] font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-4">
                      <table className="w-full border-collapse border border-white/10 text-xs sm:text-sm">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="border border-white/10 bg-[#1e1f20] text-white px-3 py-2 text-left font-semibold">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="border border-white/10 px-3 py-2 text-[#e3e3e3]">
                      {children}
                    </td>
                  );
                }
              }}
            >
              {processedText}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 py-2 w-full max-w-lg">
            <div className="h-3.5 rounded-md animate-shimmer w-[90%]" />
            <div className="h-3.5 rounded-md animate-shimmer w-[75%]" />
            <div className="h-3.5 rounded-md animate-shimmer w-[50%]" />
          </div>
        )}
      </div>
    </div>
  );
}
