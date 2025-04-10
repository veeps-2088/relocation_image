'use client';

import { useChat } from 'ai/react';
import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import InputField from './InputField';
import ErrorDisplay from './ErrorDisplay';
import LoadingIndicator from './LoadingIndicator';
import ImageCarousel from './ImageCarousel';
import { useAgentPlanning } from '@/lib/hooks/useAgentPlanning';
import { AgentContextProvider } from '@/lib/contexts/AgentContext';
import { Message, AgentAction } from '@/lib/types/agent';

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

type ChatMessage = Omit<Message, 'role'> & {
  role: 'user' | 'assistant';
  imageUrls?: string[];
  detectionResults?: DetectionResult[];
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
  initialMessages?: Message[];
}

export function ChatInterface({ initialMessages = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    // If no initial messages are provided, start with the welcome message
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
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { plan, executeAction } = useAgentPlanning();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent, imageUrls?: string[]) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log('📝 Processing message:', { input, imageUrls });
      
      // Create user message
      const userMessage: Message = {
        id: Date.now().toString(),
        content: input || (imageUrls ? 'Analyze these images' : ''),
        role: 'user',
        timestamp: new Date().toISOString(),
        imageUrls,
      };

      console.log('👤 User message created:', userMessage);
      setMessages((prev) => [...prev, userMessage]);
      setInput(''); // Clear input after submission

      // If we have images, prioritize object detection
      if (imageUrls && imageUrls.length > 0) {
        console.log('🖼️ Processing images for object detection');
        const detectAction: AgentAction = {
          type: 'detect_objects',
          payload: { imageUrls },
          timestamp: Date.now()
        };

        console.log('⚡ Executing object detection:', detectAction);
        const detectionResponse = await executeAction(detectAction);
        console.log('✅ Detection response:', detectionResponse);

        // Get high confidence objects for cost estimation
        const highConfidenceObjects = detectionResponse.detectionResults?.flatMap(result => 
          result.objects.highConfidence
        ) || [];
        console.log('💰 High confidence objects for cost estimation:', highConfidenceObjects);

        // Estimate costs
        const { items, totalCost } = aggregateDetectionResults(highConfidenceObjects);
        console.log('💰 Cost estimation results:', { items, totalCost });

        // Create assistant message with detection results and cost estimation
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: formatSummaryMessage(items, totalCost),
          role: 'assistant',
          timestamp: new Date().toISOString(),
          detectionResults: detectionResponse.detectionResults
        };

        console.log('🤖 Assistant message created:', assistantMessage);
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // For text-only messages, use the planning system
        console.log('🤖 Planning actions...');
        const actions = await plan(input, imageUrls);
        console.log('📋 Planned actions:', actions);

        for (const action of actions) {
          console.log('⚡ Executing action:', action.type);
          const response = await executeAction(action);
          console.log('✅ Action response:', response);
        }

        // Create assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: 'I have processed your message.',
          role: 'assistant',
          timestamp: new Date().toISOString(),
        };

        console.log('🤖 Assistant message created:', assistantMessage);
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-auto pt-4">
        <InputField
          input={input}
          handleInputChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          onStopGeneration={() => {}}
        />
      </div>
    </div>
  );
} 