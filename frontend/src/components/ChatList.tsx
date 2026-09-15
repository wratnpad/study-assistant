import type { RefObject } from 'react';
import ChatMessage from './ChatMessage.tsx';
import type { Message } from '../types.ts';

interface ChatListProps {
  messages: Message[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export default function ChatList({ messages, messagesEndRef }: ChatListProps) {
  return (
    <div className="max-w-3xl mx-auto w-full py-4 animate-fade-in-up">
      <div className="flex flex-col gap-8">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
