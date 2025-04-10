'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

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

interface AggregatedItem {
  name: string;
  count: number;
  priceEach: number;
  totalPrice: number;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  imageUrls?: string[];
  detectionResults?: DetectionResult[];
}

interface DetectionContextType {
  detectionResults: DetectionResult[];
  aggregatedItems: AggregatedItem[];
  totalCost: number;
  conversationHistory: Message[];
  setDetectionResults: (results: DetectionResult[]) => void;
  setAggregatedItems: (items: AggregatedItem[], totalCost: number) => void;
  addMessage: (message: Message) => void;
  clearDetectionResults: () => void;
  getLastUserMessage: () => Message | undefined;
  getLastAssistantMessage: () => Message | undefined;
}

const DetectionContext = createContext<DetectionContextType | undefined>(undefined);

export function DetectionProvider({ children }: { children: ReactNode }) {
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [aggregatedItems, setAggregatedItems] = useState<AggregatedItem[]>([]);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);

  const handleSetAggregatedItems = (items: AggregatedItem[], cost: number) => {
    setAggregatedItems(items);
    setTotalCost(cost);
  };

  const addMessage = (message: Message) => {
    setConversationHistory(prev => [...prev, message]);
  };

  const getLastUserMessage = () => {
    return conversationHistory
      .slice()
      .reverse()
      .find(msg => msg.role === 'user');
  };

  const getLastAssistantMessage = () => {
    return conversationHistory
      .slice()
      .reverse()
      .find(msg => msg.role === 'assistant');
  };

  const clearResults = () => {
    setDetectionResults([]);
    setAggregatedItems([]);
    setTotalCost(0);
    setConversationHistory([]);
  };

  return (
    <DetectionContext.Provider
      value={{
        detectionResults,
        aggregatedItems,
        totalCost,
        conversationHistory,
        setDetectionResults,
        setAggregatedItems: handleSetAggregatedItems,
        addMessage,
        clearDetectionResults: clearResults,
        getLastUserMessage,
        getLastAssistantMessage,
      }}
    >
      {children}
    </DetectionContext.Provider>
  );
}

export function useDetection() {
  const context = useContext(DetectionContext);
  if (context === undefined) {
    throw new Error('useDetection must be used within a DetectionProvider');
  }
  return context;
} 