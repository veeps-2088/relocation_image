export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
};

export type ChatState = {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
};

export type AIModel = 'gpt-4' | 'claude-3-sonnet'; 