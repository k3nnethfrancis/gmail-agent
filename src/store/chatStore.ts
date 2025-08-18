/**
 * Chat State Store using Zustand
 * 
 * Persists chat messages and input across component unmounts/remounts
 * This solves Issue #6: Chat state not persisting between views
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatState {
  // State
  messages: Message[];
  input: string;
  isLoading: boolean;
  
  // Actions
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setInput: (input: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      input: '',
      isLoading: false,
      
      // Actions
      setMessages: (messages) => set({ messages }),
      
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      
      setInput: (input) => set({ input }),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      clearChat: () => set({ 
        messages: [], 
        input: '', 
        isLoading: false 
      }),
    }),
    {
      name: 'chat-storage',
      // Only persist messages and input, not loading state
      partialize: (state) => ({ 
        messages: state.messages, 
        input: state.input 
      }),
      // Custom serialization to handle Date objects
      serialize: (state) => JSON.stringify({
        ...state,
        messages: state.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString()
        }))
      }),
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          ...parsed,
          messages: parsed.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        };
      }
    }
  )
);