'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useChat } from 'ai/react';
import InputField from './InputField';
import MessageList from './MessageList';
import { ChatMessage, ImageAnalysis } from '@/lib/types';

export default function Chat() {
  const [customMessages, setCustomMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages: aiMessages, input, handleInputChange, isLoading, stop } = useChat({
    api: '/api/chat',
  });

  // Convert AI messages to our ChatMessage format
  const formattedAiMessages = useMemo(() => {
    return aiMessages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: Date.now(),
    }));
  }, [aiMessages]);

  // Combine messages using useMemo to prevent unnecessary re-renders
  const allMessages = useMemo(() => {
    return [...customMessages, ...formattedAiMessages];
  }, [customMessages, formattedAiMessages]);

  const analyzeImage = async (imageUrl: string): Promise<ImageAnalysis> => {
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
      });
      return await response.json();
    } catch (error) {
      console.error('Error analyzing image:', error);
      return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent, imageUrl?: string) => {
    e.preventDefault();

    if (imageUrl) {
      // Handle image message
      const analysis = await analyzeImage(imageUrl);
      
      const imageMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: input || '',
        imageUrl,
        imageAnalysis: analysis,
        timestamp: Date.now()
      };

      const assistantResponse: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `I see the following objects: ${analysis.objects?.join(', ')}. ${analysis.description || ''}`,
        timestamp: Date.now()
      };

      setCustomMessages(prev => [...prev, imageMessage, assistantResponse]);
      
      // Clear input after submission
      handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages.length]); // Only trigger when the number of messages changes

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-4">
      <MessageList messages={allMessages} />
      <div ref={messagesEndRef} />
      <div className="mt-auto pt-4">
        <InputField
          input={input}
          handleInputChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          onStopGeneration={stop}
        />
      </div>
    </div>
  );
} 