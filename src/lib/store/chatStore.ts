import { create } from 'zustand';
import { ChatState, Message, AIModel } from '../types/chat';

interface ChatStore extends ChatState {
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearHistory: () => void;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
}

export const useChatStore = create<ChatStore>()((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  selectedModel: 'gpt-4',
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearHistory: () => set({ messages: [] }),
  setSelectedModel: (model) => set({ selectedModel: model }),
})); 