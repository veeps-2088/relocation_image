'use client';

import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import { useChatStore } from '@/lib/store/chatStore';
import MessageList from './MessageList';
import InputField from './InputField';
import ErrorDisplay from './ErrorDisplay';
import LoadingIndicator from './LoadingIndicator';

export default function ChatInterface() {
  const { error, addMessage } = useChatStore();
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: '/api/openai/chat',
    onFinish: () => setAbortController(null),
    onResponse: (response) => {
      // Handle any errors from the API
      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }
    },
  });

  // Sync messages with our store whenever they change
  useEffect(() => {
    messages.forEach((message) => {
      addMessage({
        id: message.id,
        content: message.content,
        role: message.role,
        createdAt: Date.now(),
      });
    });
  }, [messages, addMessage]);

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      stop();
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const controller = new AbortController();
    setAbortController(controller);
    handleSubmit(e, { signal: controller.signal });
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {error && <ErrorDisplay error={error} />}
      <div className="flex-1 overflow-y-auto mb-4">
        <MessageList messages={messages} />
      </div>
      <div className="relative">
        {isLoading && <LoadingIndicator />}
        <InputField
          input={input}
          handleInputChange={handleInputChange}
          onSubmit={onSubmit}
          isLoading={isLoading}
          onStopGeneration={handleStopGeneration}
        />
      </div>
    </div>
  );
} 