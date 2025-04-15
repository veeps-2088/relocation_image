'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import MessageList from './MessageList';
import InputField from './InputField';
import ErrorDisplay from './ErrorDisplay';
import LoadingIndicator from './LoadingIndicator';
import ImageCarousel from './ImageCarousel';
import { useAgentPlanning } from '@/lib/hooks/useAgentPlanning';
import { Message, AgentAction } from '@/lib/types/agent';
import { useDetection } from '@/lib/contexts/DetectionContext';
import { useEnhancedPlanning } from '@/lib/hooks/useEnhancedPlanning';
import { useChat as useChatContext } from '@/lib/contexts/ChatContext';

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

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
  detectionResults?: DetectionResult[];
  timestamp: string;
};

const OBJECT_PRICE_MAPPING: { [key: string]: number } = {
  person: 0,
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
  book_shelf: 200
};

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

  return `Sure! Based on the updated list, here is the estimated costs of the objects detected:

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

interface ChatInterfaceProps {
  initialMessages?: ChatMessage[];
}

export function ChatInterface({ initialMessages = [] }: ChatInterfaceProps) {
  const { uploadChatImage } = useChatContext();
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(() => {
    if (initialMessages.length === 0) {
      return [{
        id: 'welcome',
        content: "Hi there, I'm your relocation buddy! 👋 To help estimate the value of your items, you can upload one or more images of your household items. I'll analyze them and provide you with a cost estimate.",
        role: 'assistant',
        timestamp: new Date().toISOString()
      }];
    }
    return initialMessages;
  });

  const { detectionResults, setDetectionResults } = useDetection();
  const { executeAction } = useEnhancedPlanning();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasProcessedImage, setHasProcessedImage] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const formatDetectionResponse = (objects: string[]): string => {
    // Count occurrences of each object
    const objectCounts: { [key: string]: number } = {};
    objects.forEach(obj => {
      const normalizedObj = obj.toLowerCase().trim();
      objectCounts[normalizedObj] = (objectCounts[normalizedObj] || 0) + 1;
    });

    // Format the response
    const lines = Object.entries(objectCounts)
      .filter(([obj]) => OBJECT_PRICE_MAPPING[obj] > 0) // Only include items with a price
      .map(([obj, count]) => {
        const price = OBJECT_PRICE_MAPPING[obj];
        const total = price * count;
        const objName = obj.charAt(0).toUpperCase() + obj.slice(1);
        return `${objName}${count > 1 ? ` x ${count}` : ''} = $${total.toLocaleString()}`;
      });

    if (lines.length === 0) {
      return "No items with known prices were detected in the image.";
    }

    return `Here are the objects detected:\n${lines.map((line, index) => `${index + 1}. ${line}`).join('\n')}`;
  };

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/openai/chat',
    body: {
      data: detectionResults.length > 0 && !hasProcessedImage ? {
        imageUrl: detectionResults[0].imageUrl,
        detectedObjects: detectionResults[0].objects.highConfidence.join(', ')
      } : undefined
    },
    onResponse: (response) => {
      console.log('Response received:', response);
      if (detectionResults.length > 0) {
        setHasProcessedImage(true);
      }
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, localMessages]);

  const handleImageUpload = async (file: File) => {
    try {
      setIsProcessingImage(true);

      // Create a temporary URL for immediate preview
      const tempImageUrl = URL.createObjectURL(file);

      // Add image message to chat immediately
      const tempImageMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: 'I uploaded an image for analysis',
        imageUrls: [tempImageUrl],
        timestamp: new Date().toISOString()
      };

      setLocalMessages(prev => [...prev, tempImageMessage]);

      // Upload the image to storage
      const uploadedImageUrl = await uploadChatImage(file);
      
      // Run object detection
      const detectAction = {
        type: 'detect_objects',
        payload: { imageUrls: [uploadedImageUrl] },
        timestamp: Date.now()
      };

      console.log('Running object detection...');
      const detectionResponse = await executeAction(detectAction);
      console.log('Detection response:', detectionResponse);

      // Store detection results in context
      if (detectionResponse.detectionResults) {
        setDetectionResults(detectionResponse.detectionResults);
        setHasProcessedImage(false);
      }

      // Update the image message with the uploaded URL and detection results
      const updatedImageMessage: ChatMessage = {
        ...tempImageMessage,
        imageUrls: [uploadedImageUrl],
        detectionResults: detectionResponse.detectionResults
      };

      setLocalMessages(prev => {
        const updatedMessages = [...prev];
        const messageIndex = updatedMessages.findIndex(msg => msg.id === tempImageMessage.id);
        if (messageIndex !== -1) {
          updatedMessages[messageIndex] = updatedImageMessage;
        }
        return updatedMessages;
      });

      // Add formatted detection response
      if (detectionResponse.detectionResults?.[0]?.objects?.highConfidence) {
        const formattedResponse = formatDetectionResponse(detectionResponse.detectionResults[0].objects.highConfidence);
        const responseMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: formattedResponse,
          timestamp: new Date().toISOString()
        };
        setLocalMessages(prev => [...prev, responseMessage]);
      }

      return [uploadedImageUrl];
    } catch (error) {
      console.error('Error processing image:', error);
      // Remove the temporary message if there was an error
      setLocalMessages(prev => prev.filter(msg => msg.id !== Date.now().toString()));
      return [];
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Convert AI SDK messages to our ChatMessage format
  const convertedMessages = messages.map((msg, index) => {
    // Only include detection results in the first message after an image upload
    const includeDetectionResults = detectionResults.length > 0 && 
      index === 0 && 
      !hasProcessedImage;

    return {
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date().toISOString(),
      detectionResults: includeDetectionResults ? detectionResults : undefined
    };
  });

  // Combine local and AI messages
  const allMessages = [...localMessages, ...convertedMessages];

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={allMessages} />
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4">
        <InputField
          value={input}
          onChange={handleInputChange}
          onSubmit={(e) => handleSubmit(e)}
          onImageUpload={handleImageUpload}
          isLoading={isLoading || isProcessingImage}
        />
      </div>
    </div>
  );
} 