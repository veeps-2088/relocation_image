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
  book: 15, 
  piano: 1000,
  book_shelf: 200// Add average price for books
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

// Add a new type for aggregated items
interface AggregatedItem {
  name: string;
  count: number;
  priceEach: number;
  totalPrice: number;
}

// Add a helper function to aggregate and format the results
const aggregateDetectionResults = (highConfidenceObjects: string[]): {
  items: AggregatedItem[];
  totalCost: number;
} => {
  const itemCounts = new Map<string, { count: number; price: number }>();

  // Process each detected object
  highConfidenceObjects.forEach(obj => {
    // Extract the base label (remove confidence and price info)
    const match = obj.match(/^([^(]+)/);
    if (!match) return;
    
    const label = match[1].trim().toLowerCase();
    const price = OBJECT_PRICE_MAPPING[label] || 0;

    // Skip items with no price or people
    if (price === 0) return;

    // Update counts
    const existing = itemCounts.get(label);
    if (existing) {
      itemCounts.set(label, { 
        count: existing.count + 1,
        price
      });
    } else {
      itemCounts.set(label, { count: 1, price });
    }
  });

  // Convert to array and sort by total price
  const items: AggregatedItem[] = Array.from(itemCounts.entries())
    .map(([name, { count, price }]) => ({
      name,
      count,
      priceEach: price,
      totalPrice: count * price
    }))
    .sort((a, b) => b.totalPrice - a.totalPrice);

  // Calculate total cost
  const totalCost = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return { items, totalCost };
};

// Update the formatSummaryMessage function
const formatSummaryMessage = (items: AggregatedItem[], totalCost: number): string => {
  const itemLines = items.map((item, index) => {
    const itemText = `${index + 1}. ${item.name.charAt(0).toUpperCase() + item.name.slice(1)} x ${item.count} ` +
      `($${item.priceEach.toLocaleString()} each) = $${item.totalPrice.toLocaleString()}`;
    return itemText;
  });

  return `Sure! Based on the updated list, here is the revised breakdown of potential moving costs:

${itemLines.join('\n')}

Total estimated moving cost for the identified items: $${totalCost.toLocaleString()}

If you have any more items to add or any changes, feel free to let me know!`;
};

// Add to existing interfaces
interface ObjectConfirmation {
  label: string;
  score: string;
  confirmed: boolean;
  imageUrl: string;
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

  const handleUpdateRequest = (message: string) => {
    const currentMessage = aiMessages[aiMessages.length - 1];
    
    if (message.toLowerCase().includes('update list') || 
        message.toLowerCase().includes('show summary')) {
      
      // Get the confirmed objects from the current message
      const confirmedObjects = currentMessage.confirmedObjects || [];
      
      // Trigger the object confirmation handler with the stored confirmations
      handleObjectConfirmations(confirmedObjects);
      
      // Add a system message confirming the update
      const confirmationMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: 'I\'ve updated the moving cost estimate with your confirmed items.',
        createdAt: new Date()
      };
      
      setMessages([...aiMessages, confirmationMessage]);
    }
  };

  const handleSubmitWithImage = async (e: React.FormEvent, imageUrls?: string[]) => {
    e.preventDefault();
    setError(null);
    
    // If no images, check if it's an update request
    if (!imageUrls) {
      handleUpdateRequest(input);
    }
    
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

        // After processing all images and getting allHighConfidenceObjects:
        const { items, totalCost } = aggregateDetectionResults(allHighConfidenceObjects);
        
        // Update the image message with detection results
        const updatedImageMessage = {
          ...imageMessage,
          content: formatSummaryMessage(items, totalCost),
          imageUrls: imageUrls,
          detectionResults: detectionResults
        };
        
        // Update chat history with the results
        setMessages([...aiMessages.slice(0, -1), updatedImageMessage]);

        // Send to OpenAI with detection results
        await handleSubmit(e, {
          data: {
            imageUrls,
            detectedObjects: allHighConfidenceObjects,
            summary: { items, totalCost }
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

  // Update the handleObjectConfirmations function
  const handleObjectConfirmations = (confirmations: ObjectConfirmation[]) => {
    // Debug log the incoming confirmations
    console.log('Received confirmations:', confirmations);
    
    // Get the current message
    const currentMessage = aiMessages[aiMessages.length - 1];
    
    // Get existing confirmed objects and add new ones
    const existingConfirmations = currentMessage.confirmedObjects || [];
    const allConfirmations = [...existingConfirmations, ...confirmations];
    console.log('All confirmations after merge:', allConfirmations);

    // Get all high confidence objects from the current detection results
    const highConfidenceObjects = currentMessage.detectionResults?.flatMap(
      result => result.objects.highConfidence
    ) || [];

    // Create array for all objects to be included in final calculation
    const allObjects: string[] = [...highConfidenceObjects];

    // Add all confirmed objects
    allConfirmations.forEach(obj => {
      const label = obj.label;
      const score = parseFloat(obj.score);
      const price = OBJECT_PRICE_MAPPING[label.toLowerCase()];
      
      // Debug log each object being added
      console.log('Adding confirmed object:', {
        label,
        score,
        price,
        formatted: `${label} (${Math.round(score)}% confident${price ? `, Est. $${price}` : ''})`
      });

      // Add the confirmed object in the same format as high confidence objects
      allObjects.push(
        `${label} (${Math.round(score)}% confident${price ? `, Est. $${price}` : ''})`
      );
    });

    // Calculate final summary with all objects
    const { items, totalCost } = aggregateDetectionResults(allObjects);
    
    // Debug log final results
    console.log('Final aggregated items:', items);
    console.log('Total objects in list:', allObjects.length);

    // Update the message with new summary and store ALL confirmations
    const updatedMessage = {
      ...currentMessage,
      content: formatSummaryMessage(items, totalCost),
      detectionResults: currentMessage.detectionResults,
      confirmedObjects: allConfirmations  // Store all confirmations, not just the new ones
    };

    // Update messages
    setMessages([
      ...aiMessages.slice(0, -1), 
      updatedMessage
    ]);
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