'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatMessage, createChatSession, getChatHistory, saveChatMessage, uploadImage } from '../supabase/chatUtils';

interface ChatContextType {
  currentSessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  createNewSession: () => Promise<void>;
  addMessage: (message: Omit<ChatMessage, 'session_id'>) => Promise<void>;
  uploadChatImage: (file: File) => Promise<string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize a session when the provider mounts
  useEffect(() => {
    createNewSession();
  }, []);

  const createNewSession = async () => {
    setIsLoading(true);
    try {
      const sessionId = await createChatSession();
      setCurrentSessionId(sessionId);
      setMessages([]);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = async (message: Omit<ChatMessage, 'session_id'>) => {
    if (!currentSessionId) {
      // If no session exists, create one first
      await createNewSession();
    }
    
    setIsLoading(true);
    try {
      const newMessage = await saveChatMessage({
        ...message,
        session_id: currentSessionId!,
      });
      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Error saving message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadChatImage = async (file: File) => {
    if (!currentSessionId) {
      // If no session exists, create one first
      await createNewSession();
    }
    return uploadImage(file, currentSessionId!);
  };

  useEffect(() => {
    if (currentSessionId) {
      getChatHistory(currentSessionId)
        .then(history => setMessages(history))
        .catch(error => console.error('Error fetching chat history:', error));
    }
  }, [currentSessionId]);

  return (
    <ChatContext.Provider
      value={{
        currentSessionId,
        messages,
        isLoading,
        createNewSession,
        addMessage,
        uploadChatImage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
} 