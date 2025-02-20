'use client';

import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import { useChatStore } from '@/lib/store/chatStore';
import MessageList from './MessageList';
import InputField from './InputField';
import ErrorDisplay from './ErrorDisplay';
import LoadingIndicator from './LoadingIndicator';

export default function ChatInterface() {
  const { error, addMessage, setError } = useChatStore();
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: '/api/openai/chat',
    onFinish: () => setAbortController(null),
    onError: (error) => {
      console.error('Chat error:', error);
      setError(error.message || 'An error occurred during the chat');
    },
  });

  useEffect(() => {
    messages.forEach((message) => {
      addMessage({
        id: message.id,
        content: message.content,
        role: message.role,
        createdAt: Date.now(),
        imageUrl: message.role === 'user' ? (message as any).imageUrl : undefined,
      });
    });
  }, [messages, addMessage]);

  const handleSubmitWithImage = async (e: React.FormEvent, imageUrl?: string) => {
    e.preventDefault();
    setError(null);
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      await handleSubmit(e, {
        signal: controller.signal,
        data: {
          imageUrl: imageUrl,
        },
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
        <MessageList messages={messages} />
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