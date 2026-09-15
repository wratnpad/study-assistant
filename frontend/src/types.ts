import type { ReactNode } from 'react';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface SuggestionItem {
  icon: ReactNode;
  title: string;
  subtitle: string;
  prompt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
}
