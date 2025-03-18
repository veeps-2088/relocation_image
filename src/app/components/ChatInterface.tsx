'use client';

import { useChat } from 'ai/react';
import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import InputField from './InputField';
import ErrorDisplay from './ErrorDisplay';
import LoadingIndicator from './LoadingIndicator';
import ImageCarousel from './ImageCarousel';

type ChatMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  imageUrl?: string;
  lowerConfidenceObjects?: Array<{
    label: string;
    score: string;
    box: {
      xmin: number;
      ymin: number;
      xmax: number;
      ymax: number;
    };
  }>;
  createdAt: Date;
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
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages: aiMessages,
    input,
    handleInputChange,
    setMessages,
    handleSubmit,
    isLoading,
    stop
  } = useChat({
    api: '/api/openai/chat',
    initialMessages: [
      {
        id: 'welcome-message',
        role: 'assistant',
        content: "Hi there, I'm your relocation buddy! 👋 To help estimate your moving costs, could you please upload an image of your household items?",
        createdAt: Date.now()
      }
    ],
    onFinish: () => {
      setAbortController(null);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setError(error.message || 'An error occurred during the chat');
    },
  });

  const displayMessages = aiMessages;

  const handleSubmitWithImage = async (e: React.FormEvent, imageUrl?: string) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (imageUrl) {
        // Create the image message
        const imageMessage = {
          id: Date.now().toString(),
          content: 'Analyzing image...',
          role: 'user' as const,
          imageUrl: imageUrl,
          createdAt: new Date()
        };
        
        // Add image message to chat history
        setMessages([...aiMessages, imageMessage]);

        // Analyze the image
        const response = await fetch('/api/object-detection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });

        const detectionResults = await response.json();

        // Separate objects by confidence level
        const highConfidenceObjects = [];
        const lowerConfidenceObjects = [];

        if (detectionResults.success) {
          for (const result of detectionResults.results) {
            const score = parseFloat(result.score);
            if (score > 75) {
              const price = OBJECT_PRICE_MAPPING[result.label.toLowerCase()] || 'N/A';
              highConfidenceObjects.push(
                `${result.label} (${Math.round(score)}% confident${price !== 'N/A' ? `, Est. $${price}` : ''})`
              );
            } else if (score >= 50 && score <= 74) {
              lowerConfidenceObjects.push({
                label: result.label,
                score: result.score,
                box: result.box
              });
            }
          }
        }

        // Update the image message with detection results
        const updatedImageMessage = {
          ...imageMessage,
          content: highConfidenceObjects.length > 0 
            ? `Objects detected: ${highConfidenceObjects.join(', ')}`
            : 'No high-confidence objects detected',
          lowerConfidenceObjects: lowerConfidenceObjects
        };
        
        // Update chat history with the results
        setMessages([...aiMessages.slice(0, -1), updatedImageMessage]);

        // Send to OpenAI with detection results
        await handleSubmit(e, {
          data: {
            imageUrl,
            detectedObjects: highConfidenceObjects
          }
        });

      } else {
        // Handle regular text message
        await handleSubmit(e);
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while sending the message');
    }
  };

  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(scrollTimeout);
  }, [displayMessages.length]);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {error && (
        <div className="mb-4">
          <ErrorDisplay error={error} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto mb-4">
        <MessageList messages={displayMessages} />
        <div ref={messagesEndRef} />
      </div>
      <div className="relative">
        {isLoading && <LoadingIndicator />}
        <InputField
          input={input}
          handleInputChange={handleInputChange}
          onSubmit={handleSubmitWithImage}
          isLoading={isLoading}
          onStopGeneration={stop}
        />
      </div>
    </div>
  );
} 