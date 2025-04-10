'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AgentState, AgentAction, AgentContext as AgentContextType, AgentResponse, AggregatedItem, DetectionResult } from '../types/agent';
import { DetectionProvider, useDetection } from './DetectionContext';

// Price mapping for common items
const OBJECT_PRICE_MAPPING: Record<string, number> = {
  'couch': 500,
  'chair': 100,
  'table': 200,
  'bed': 800,
  'desk': 300,
  'lamp': 50,
  'tv': 1000,
  'refrigerator': 1000,
  'microwave': 100,
  'stove': 500,
  'dishwasher': 500,
  'washing machine': 500,
  'dryer': 500,
  'bookcase': 200,
  'dresser': 300,
  'nightstand': 100,
  'rug': 200,
  'mirror': 100,
  'plant': 50
};

interface AgentContextProviderProps {
  children: ReactNode;
}

const initialAgentState: AgentState = {
  role: 'planner',
  capabilities: [
    {
      name: 'object_detection',
      description: 'Detect and identify objects in images',
      parameters: { confidenceThreshold: 0.75 }
    },
    {
      name: 'cost_estimation',
      description: 'Estimate the cost of the detected items',
      parameters: { currency: 'USD' }
    },
    {
      name: 'planning',
      description: 'Create and manage task plans',
      parameters: { maxSteps: 5 }
    }
  ],
  memory: {
    shortTerm: {
      currentTask: '',
      context: {}
    },
    longTerm: {
      pastTasks: [],
      learnedPatterns: {}
    }
  },
  currentPlan: [],
  status: 'idle',
  messages: [],
  currentAction: null,
  isProcessing: false
};

const AgentContext = createContext<{
  agentState: AgentState;
  executeAction: (action: AgentAction) => Promise<AgentResponse>;
  updateContext: (context: Partial<AgentContextType>) => void;
} | undefined>(undefined);

function AgentContextProviderInner({ children }: AgentContextProviderProps) {
  const [agentState, setAgentState] = useState<AgentState>(initialAgentState);
  const [context, setContext] = useState<AgentContextType>({
    userInput: '',
    systemState: {},
    availableTools: ['object_detection', 'cost_estimation', 'planning']
  });

  const { setDetectionResults, setAggregatedItems } = useDetection();

  const updateContext = useCallback((newContext: Partial<AgentContextType>) => {
    setContext(prev => ({ ...prev, ...newContext }));
  }, []);

  const executeAction = useCallback(async (action: AgentAction): Promise<AgentResponse> => {
    try {
      setAgentState(prev => ({ ...prev, status: 'executing' }));

      let response: AgentResponse;
      
      switch (action.type) {
        case 'analyze_input':
          const { input } = action.payload;
          response = {
            action,
            reasoning: 'Input analyzed for intent and required actions',
            confidence: 0.95,
            analysis: {
              intent: input.toLowerCase().includes('image') ? 'image_analysis' : 'text_query',
              requiresImages: input.toLowerCase().includes('image'),
              requiresCostEstimation: input.toLowerCase().includes('cost') || input.toLowerCase().includes('price')
            }
          };
          break;

        case 'detect_objects':
          console.log('🔍 Processing detect_objects action');
          const { imageUrls } = action.payload;
          if (!imageUrls || !Array.isArray(imageUrls)) {
            console.error('❌ Invalid imageUrls in payload:', imageUrls);
            throw new Error('Invalid imageUrls provided');
          }
          console.log('📸 Image URLs to process:', imageUrls);
          
          const detectionResults = await Promise.all(
            imageUrls.map(async (url: string) => {
              console.log('🔄 Processing image:', url);
              const detectionResponse = await fetch('/api/object-detection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url }),
              });
              
              if (!detectionResponse.ok) {
                console.error('❌ Object detection API error:', detectionResponse.status, detectionResponse.statusText);
                throw new Error(`Object detection failed: ${detectionResponse.status} ${detectionResponse.statusText}`);
              }
              
              const result = await detectionResponse.json();
              console.log('✅ Received detection result for image:', result);
              return result;
            })
          );

          console.log('📊 All detection results:', detectionResults);
          response = {
            action,
            reasoning: 'Objects detected in images',
            confidence: 0.9,
            detectionResults: detectionResults.map(result => ({
              imageUrl: imageUrls[0], // Using first URL for now
              objects: {
                highConfidence: result.results
                  .filter((r: any) => parseFloat(r.score) >= 75)
                  .map((r: any) => r.label),
                lowerConfidence: result.results
                  .filter((r: any) => parseFloat(r.score) < 75)
                  .map((r: any) => ({
                    label: r.label,
                    score: r.score,
                    box: r.box
                  }))
              }
            }))
          };
          break;

        case 'estimate_costs':
          const { items, totalCost } = action.payload;
          response = {
            action,
            reasoning: 'Costs estimated based on item prices and quantities',
            confidence: 0.85,
            items,
            totalCost
          };
          break;

        case 'update_plan':
          setAgentState(prev => ({
            ...prev,
            currentPlan: action.payload.steps
          }));
          response = {
            action,
            reasoning: 'Plan updated with new steps',
            confidence: 0.95
          };
          break;

        case 'analyze_costs': {
          const { context } = action.payload;
          const { aggregatedItems, totalCost: costTotal } = context;
          
          if (!aggregatedItems || aggregatedItems.length === 0) {
            response = {
              action,
              content: "I don't have any cost information to analyze. Please upload some images first.",
              reasoning: 'No cost data available for analysis',
              confidence: 1.0
            };
            break;
          }

          const mostExpensive = aggregatedItems.reduce((max: AggregatedItem, item: AggregatedItem) => 
            item.totalPrice > max.totalPrice ? item : max
          , aggregatedItems[0]);

          // Generate a more detailed cost analysis
          const costBreakdown = aggregatedItems
            .sort((a: AggregatedItem, b: AggregatedItem) => b.totalPrice - a.totalPrice)
            .map((item: AggregatedItem) => `${item.name}: $${item.totalPrice.toLocaleString()}`)
            .join('\n');

          response = {
            action,
            content: `The most expensive item detected is ${mostExpensive.name} with a total value of $${mostExpensive.totalPrice.toLocaleString()}.\n\nHere's a breakdown of all items by value:\n${costBreakdown}`,
            reasoning: 'Analyzed costs to find most expensive item and provided cost breakdown',
            confidence: 0.95
          };
          break;
        }

        case 'analyze_items': {
          const itemContext = action.payload.context;
          const { detectionResults: results } = itemContext;
          
          if (!results || results.length === 0) {
            response = {
              action,
              content: "I don't have any items to analyze. Please upload some images first.",
              reasoning: 'No items detected for analysis',
              confidence: 1.0
            };
            break;
          }

          const totalItems = results.reduce((count: number, result: DetectionResult) => 
            count + result.objects.highConfidence.length, 0
          );

          // Generate a more detailed item analysis
          const itemCategories = new Map<string, number>();
          results.forEach((result: DetectionResult) => {
            result.objects.highConfidence.forEach((item: string) => {
              const category = item.split('_')[0]; // Get the base category
              itemCategories.set(category, (itemCategories.get(category) || 0) + 1);
            });
          });

          const categoryBreakdown = Array.from(itemCategories.entries())
            .map(([category, count]) => `${category}: ${count} items`)
            .join('\n');

          response = {
            action,
            content: `I've detected ${totalItems} items in total.\n\nHere's a breakdown by category:\n${categoryBreakdown}\n\nItems detected: ${results[0].objects.highConfidence.join(', ')}.`,
            reasoning: 'Analyzed detected items and provided category breakdown',
            confidence: 0.9
          };
          break;
        }

        case 'moving_advice': {
          const movingContext = action.payload.context;
          const { aggregatedItems: movingItems } = movingContext;
          
          if (!movingItems || movingItems.length === 0) {
            response = {
              action,
              content: "I don't have any items to provide moving advice for. Please upload some images first.",
              reasoning: 'No items available for moving advice',
              confidence: 1.0
            };
            break;
          }

          // Generate more detailed moving advice
          const advice = movingItems.map((item: AggregatedItem) => {
            let specificAdvice = '';
            if (item.name.includes('electronic') || item.name.includes('computer') || item.name.includes('tv')) {
              specificAdvice = 'Pack in original boxes if possible, use anti-static materials.';
            } else if (item.name.includes('furniture') || item.name.includes('sofa') || item.name.includes('table')) {
              specificAdvice = 'Disassemble if possible, wrap corners with padding.';
            } else if (item.name.includes('glass') || item.name.includes('mirror')) {
              specificAdvice = 'Use bubble wrap and sturdy boxes, mark as fragile.';
            } else {
              specificAdvice = 'Use appropriate packing materials and handle with care.';
            }
            return `For ${item.name}${item.count > 1 ? ` (${item.count} items)` : ''}:\n${specificAdvice}`;
          }).join('\n\n');

          response = {
            action,
            content: `Here's detailed moving advice for your items:\n\n${advice}`,
            reasoning: 'Generated detailed moving advice based on item types',
            confidence: 0.85
          };
          break;
        }

        case 'modify_items': {
          const modifyContext = action.payload.context;
          const { aggregatedItems: currentItems } = modifyContext;
          const { input } = action.payload;
          
          if (!currentItems || currentItems.length === 0) {
            response = {
              action,
              content: "I don't have any items to modify. Please upload some images first.",
              reasoning: 'No items available for modification',
              confidence: 1.0
            };
            break;
          }

          // Parse the modification request
          const updateMatch = input.match(/(?:update|change|modify|set).*?(\d+)\s+(\w+)/i);
          const addMatch = input.match(/(?:add|include|insert).*?(\d+)\s+(\w+)/i);
          const removeMatch = input.match(/(?:remove|delete|exclude).*?(\w+)/i);

          if (updateMatch) {
            const [, count, itemName] = updateMatch;
            const itemIndex = currentItems.findIndex((item: AggregatedItem) => 
              item.name.toLowerCase() === itemName.toLowerCase()
            );

            if (itemIndex !== -1) {
              currentItems[itemIndex].count = parseInt(count);
              currentItems[itemIndex].totalPrice = currentItems[itemIndex].priceEach * parseInt(count);
              
              response = {
                action,
                content: `I've updated the count of ${itemName} to ${count}.`,
                reasoning: 'Updated item count',
                confidence: 0.9
              };
            } else {
              response = {
                action,
                content: `I couldn't find ${itemName} in the current list.`,
                reasoning: 'Item not found for update',
                confidence: 0.9
              };
            }
          } else if (addMatch) {
            const [, count, itemName] = addMatch;
            const existingItem = currentItems.find((item: AggregatedItem) => 
              item.name.toLowerCase() === itemName.toLowerCase()
            );

            if (existingItem) {
              existingItem.count += parseInt(count);
              existingItem.totalPrice = existingItem.priceEach * existingItem.count;
              
              response = {
                action,
                content: `I've added ${count} more ${itemName} to the list.`,
                reasoning: 'Added to existing item count',
                confidence: 0.9
              };
            } else {
              // Add new item with default price if not in price mapping
              const priceEach = OBJECT_PRICE_MAPPING[itemName.toLowerCase()] || 0;
              currentItems.push({
                name: itemName,
                count: parseInt(count),
                priceEach,
                totalPrice: priceEach * parseInt(count)
              });
              
              response = {
                action,
                content: `I've added ${count} ${itemName} to the list${priceEach > 0 ? ` with an estimated value of $${(priceEach * parseInt(count)).toLocaleString()} each` : ''}.`,
                reasoning: 'Added new item',
                confidence: 0.9
              };
            }
          } else if (removeMatch) {
            const [, itemName] = removeMatch;
            const itemIndex = currentItems.findIndex((item: AggregatedItem) => 
              item.name.toLowerCase() === itemName.toLowerCase()
            );

            if (itemIndex !== -1) {
              currentItems.splice(itemIndex, 1);
              response = {
                action,
                content: `I've removed ${itemName} from the list.`,
                reasoning: 'Removed item',
                confidence: 0.9
              };
            } else {
              response = {
                action,
                content: `I couldn't find ${itemName} in the current list.`,
                reasoning: 'Item not found for removal',
                confidence: 0.9
              };
            }
          } else {
            response = {
              action,
              content: "I'm not sure what changes you'd like to make. Please specify if you want to add, update, or remove items.",
              reasoning: 'Unclear modification request',
              confidence: 0.8
            };
          }

          // Update the aggregated items in context using the hook from component level
          const totalCost = currentItems.reduce((sum: number, item: AggregatedItem) => sum + item.totalPrice, 0);
          setAggregatedItems(currentItems, totalCost);
          break;
        }

        case 'follow_up': {
          const followUpContext = action.payload.context;
          const { previousMessage } = action.payload;
          
          if (!previousMessage) {
            response = {
              action,
              content: "I'm not sure what you're referring to. Could you please provide more context?",
              reasoning: 'No previous message for follow-up',
              confidence: 1.0
            };
            break;
          }

          response = {
            action,
            content: `Regarding your previous question about ${previousMessage.content}, I can provide more details. What specific information would you like to know?`,
            reasoning: 'Generated follow-up response',
            confidence: 0.8
          };
          break;
        }

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      setAgentState(prev => ({ ...prev, status: 'idle' }));
      return response;
    } catch (error) {
      setAgentState(prev => ({ ...prev, status: 'idle' }));
      throw error;
    }
  }, [setAggregatedItems]);

  return (
    <AgentContext.Provider value={{ agentState, executeAction, updateContext }}>
      {children}
    </AgentContext.Provider>
  );
}

export function AgentContextProvider({ children }: AgentContextProviderProps) {
  return (
    <DetectionProvider>
      <AgentContextProviderInner>{children}</AgentContextProviderInner>
    </DetectionProvider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentContextProvider');
  }
  return context;
} 