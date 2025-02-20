import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatState, Message } from '../types/chat';

interface ChatStore extends ChatState {
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearHistory: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      isLoading: false,
      error: null,
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearHistory: () => set({ messages: [] }),
    }),
    {
      name: 'chat-storage',
    }
  )
); 