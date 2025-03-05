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

const OBJECT_PRICE_MAPPING: { [key: string]: number } = {
  person: 0, // No price for people
  car: 25000,
  truck: 45000,
  bicycle: 500,
  motorcycle: 8000,
  bus: 100000,
  chair: 150,
  sofa: 1000,
  couch: 1000,
  potted_plant: 100,
  table: 500,
  bed: 800,
  laptop: 1200,
  computer: 1500,
  phone: 800,
  tv: 700,
  // Add more objects as needed
};

export default function ChatInterface() {
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: '/api/openai/chat',
    initialMessages: [
      {
        id: 'welcome-message',
        role: 'assistant',
        content: "Hi there, I'm your relocation buddy! 👋 To help estimate your moving costs, could you please upload an image of your household items? This will help me identify items and provide a rough cost estimate.",
        createdAt: Date.now()
      }
    ],
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
        console.log('Image received, sending to Hugging Face for detection...');

        const response = await fetch('/api/object-detection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl }),
        });

        const detectionResults = await response.json();
        console.log('Detection results:', detectionResults);

        // Format the detection results with prices
        const detectedObjects = detectionResults.success 
          ? detectionResults.results
              .filter((r: { score: string }) => parseFloat(r.score) > 90)
              .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
              .map((r: { label: string, score: string }) => {
                const price = OBJECT_PRICE_MAPPING[r.label.toLowerCase()] || 'N/A';
                const accuracy = Math.round(parseFloat(r.score));
                return `${r.label} (${accuracy}% confident${price !== 'N/A' ? `, Est. $${price}` : ''})`;
              })
          : [];
        
        const detectionText = detectedObjects.length > 0 
          ? `Objects detected: ${detectedObjects.join(', ')}`
          : 'No objects detected';

        // Create message with both image and detection results
        const imageMessage: ChatMessage = {
          id: Date.now().toString(),
          content: detectionText,
          role: 'user',
          createdAt: Date.now(),
          imageUrl: imageUrl,
        };
        setChatMessages(prev => [...prev, imageMessage]);

        // Send to OpenAI with detection results
        await handleSubmit(e, {
          data: JSON.stringify({ 
            imageUrl,
            detectedObjects 
          })
        });
      } else {
        // For regular text messages, just call handleSubmit without any data
        await handleSubmit(e);
      }
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