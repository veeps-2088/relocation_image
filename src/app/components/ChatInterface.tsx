'use client';

import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import InputField from './InputField';
import ErrorDisplay from './ErrorDisplay';
import LoadingIndicator from './LoadingIndicator';

type ChatMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  imageUrl?: string;
  createdAt: number;
};

export default function ChatInterface() {
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: '/api/openai/chat',
    onFinish: () => setAbortController(null),
    onError: (error) => {
      console.error('Chat error:', error);
      setError(error.message || 'An error occurred during the chat');
    },
  });

  // Sync AI SDK messages with our local state
  useEffect(() => {
    const newMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      role: message.role as 'user' | 'assistant',
      createdAt: Date.now(),
      imageUrl: (message as any).data?.imageUrl
    })).filter(message => 
      message.role === 'user' || message.role === 'assistant'
    );
    
    setChatMessages(newMessages);
  }, [messages]);

  const handleSubmitWithImage = async (e: React.FormEvent, imageUrl?: string) => {
    e.preventDefault();
    setError(null);
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      if (imageUrl) {
        // Add image message to local state immediately
        const imageMessage: ChatMessage = {
          id: Date.now().toString(),
          content: '',
          role: 'user',
          createdAt: Date.now(),
          imageUrl: imageUrl,
        };
        setChatMessages(prev => [...prev, imageMessage]);
      }

      // Submit to API with proper typing
      await handleSubmit(e, {
        data: JSON.stringify({ imageUrl }) as any
      });

    } catch (error) {
      console.error('Submit error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while sending the message');
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      stop();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {error && (
        <div className="mb-4">
          <ErrorDisplay error={error} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto mb-4">
        <MessageList messages={chatMessages} />
      </div>
      <div className="relative">
        {isLoading && <LoadingIndicator />}
        <InputField
          input={input}
          handleInputChange={handleInputChange}
          onSubmit={handleSubmitWithImage}
          isLoading={isLoading}
          onStopGeneration={handleStopGeneration}
        />
      </div>
    </div>
  );
} 