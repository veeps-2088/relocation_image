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
  imageUrls?: string[];
  detectionResults?: Array<{
    imageUrl: string;
    objects: {
      highConfidence: string[];
      lowerConfidence: Array<{
        label: string;
        score: string;
        box: {
          xmin: number;
          ymin: number;
          xmax: number;
          ymax: number;
        };
      }>;
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

interface DetectionResult {
  imageUrl: string;
  objects: {
    highConfidence: string[];
    lowerConfidence: Array<{
      label: string;
      score: string;
      box: {
        xmin: number;
        ymin: number;
        xmax: number;
        ymax: number;
      };
    }>;
  };
}

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

  const handleSubmitWithImage = async (e: React.FormEvent, imageUrls?: string[]) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (imageUrls && imageUrls.length > 0) {
        // Create initial message for image analysis
        const imageMessage = {
          id: Date.now().toString(),
          content: `Analyzing ${imageUrls.length} image${imageUrls.length > 1 ? 's' : ''}...`,
          role: 'user' as const,
          imageUrls: imageUrls,
          createdAt: new Date()
        };
        
        // Add image message to chat history
        setMessages([...aiMessages, imageMessage]);

        // Analyze all images
        const detectionResults: DetectionResult[] = [];

        for (const imageUrl of imageUrls) {
          const response = await fetch('/api/object-detection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl }),
          });

          const result = await response.json();
          
          // Process detection results
          const highConfidenceObjects: string[] = [];
          const lowerConfidenceObjects = [];

          if (result.success) {
            for (const detection of result.results) {
              const score = parseFloat(detection.score);
              if (score > 75) {
                const price = OBJECT_PRICE_MAPPING[detection.label.toLowerCase()] || 'N/A';
                highConfidenceObjects.push(
                  `${detection.label} (${Math.round(score)}% confident${price !== 'N/A' ? `, Est. $${price}` : ''})`
                );
              } else if (score >= 50 && score <= 74) {
                lowerConfidenceObjects.push({
                  label: detection.label,
                  score: detection.score,
                  box: detection.box
                });
              }
            }
          }

          detectionResults.push({
            imageUrl,
            objects: {
              highConfidence: highConfidenceObjects,
              lowerConfidence: lowerConfidenceObjects
            }
          });
        }

        // Aggregate all detected objects
        const allHighConfidenceObjects = detectionResults.flatMap(r => r.objects.highConfidence);

        // Update the image message with detection results
        const updatedImageMessage = {
          ...imageMessage,
          content: allHighConfidenceObjects.length > 0 
            ? `Total objects detected across ${imageUrls.length} image${imageUrls.length > 1 ? 's' : ''}: ${allHighConfidenceObjects.join(', ')}`
            : 'No high-confidence objects detected in any image',
          imageUrls: imageUrls,
          detectionResults: detectionResults
        };
        
        // Update chat history with the results
        setMessages([...aiMessages.slice(0, -1), updatedImageMessage]);

        // Send to OpenAI with detection results
        await handleSubmit(e, {
          data: {
            imageUrls,
            detectedObjects: allHighConfidenceObjects
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