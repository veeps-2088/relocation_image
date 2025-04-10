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

interface DetectionContextType {
  detectionResults: DetectionResult[];
  aggregatedItems: AggregatedItem[];
  totalCost: number;
  setDetectionResults: (results: DetectionResult[]) => void;
  setAggregatedItems: (items: AggregatedItem[], totalCost: number) => void;
  clearDetectionResults: () => void;
}

const DetectionContext = createContext<DetectionContextType | undefined>(undefined);

export function DetectionProvider({ children }: { children: ReactNode }) {
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [aggregatedItems, setAggregatedItems] = useState<AggregatedItem[]>([]);
  const [totalCost, setTotalCost] = useState<number>(0);

  const handleSetAggregatedItems = (items: AggregatedItem[], cost: number) => {
    setAggregatedItems(items);
    setTotalCost(cost);
  };

  const clearResults = () => {
    setDetectionResults([]);
    setAggregatedItems([]);
    setTotalCost(0);
  };

  return (
    <DetectionContext.Provider
      value={{
        detectionResults,
        aggregatedItems,
        totalCost,
        setDetectionResults,
        setAggregatedItems: handleSetAggregatedItems,
        clearDetectionResults: clearResults,
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