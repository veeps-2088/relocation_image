export type MessageRole = 'user' | 'assistant';

export interface ImageAnalysis {
  objects?: string[];
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  imageUrl?: string;
  imageAnalysis?: ImageAnalysis;
  timestamp: number;
} 