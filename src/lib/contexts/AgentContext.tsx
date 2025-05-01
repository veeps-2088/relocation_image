'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AgentState, AgentAction, AgentContext as AgentContextType, AgentResponse, AggregatedItem, DetectionResult, Message } from '../types/agent';
import { DetectionProvider, useDetection } from './DetectionContext';
import { useChat } from 'ai/react';

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

  const { setDetectionResults, setAggregatedItems, aggregatedItems } = useDetection();
  const { messages, append, isLoading } = useChat({
    api: '/api/agent',
    body: {
      items: aggregatedItems
    },
    onResponse: async (response: Response) => {
      // Get the response text
      const responseText = await response.text();
      
      // Update the agent state with the response
      const newMessage: Message = {
        id: Date.now().toString(),
        content: responseText,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      setAgentState(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage]
      }));
    }
  });

  const updateContext = useCallback((newContext: Partial<AgentContextType>) => {
    setContext(prev => ({ ...prev, ...newContext }));
  }, []);

  const executeAction = useCallback(async (action: AgentAction): Promise<AgentResponse> => {
    try {
      setAgentState(prev => ({ ...prev, status: 'executing' }));

      let response: AgentResponse;
      
      switch (action.type) {
        case 'detect_objects': {
          const { imageUrls } = action.payload;
          console.log('Processing image URLs:', imageUrls);
          
          const detectionResults = await Promise.all(
            imageUrls.map(async (url: string) => {
              console.log('Sending detection request for URL:', url);
              try {
                const detectionResponse = await fetch('/api/object-detection', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imageUrl: url }),
                });
                
                if (!detectionResponse.ok) {
                  const errorText = await detectionResponse.text();
                  console.error('Detection API error:', {
                    status: detectionResponse.status,
                    statusText: detectionResponse.statusText,
                    body: errorText
                  });
                  throw new Error(`Object detection failed: ${detectionResponse.status} ${detectionResponse.statusText}\n${errorText}`);
                }
                
                const result = await detectionResponse.json();
                console.log('Detection result:', result);
                
                if (!result.success) {
                  throw new Error(result.error || 'Object detection failed without error details');
                }
                
                return {
                  imageUrl: url,
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
                };
              } catch (error) {
                console.error('Error processing image:', error);
                throw error;
              }
            })
          );

          // Store the detection results
          setDetectionResults(detectionResults);

          response = {
            action,
            reasoning: 'Objects detected in images',
            confidence: 0.9,
            detectionResults
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

          let modifiedItems = [...currentItems];
          let modificationMessage = '';

          if (updateMatch) {
            const [, count, itemName] = updateMatch;
            const itemIndex = modifiedItems.findIndex((item: AggregatedItem) => 
              item.name.toLowerCase() === itemName.toLowerCase()
            );

            if (itemIndex !== -1) {
              modifiedItems[itemIndex].count = parseInt(count);
              modifiedItems[itemIndex].totalPrice = modifiedItems[itemIndex].priceEach * parseInt(count);
              modificationMessage = `I've updated the count of ${itemName} to ${count}.`;
            } else {
              modificationMessage = `I couldn't find ${itemName} in the current list.`;
            }
          } else if (addMatch) {
            const [, count, itemName] = addMatch;
            const existingItem = modifiedItems.find((item: AggregatedItem) => 
              item.name.toLowerCase() === itemName.toLowerCase()
            );

            if (existingItem) {
              existingItem.count += parseInt(count);
              existingItem.totalPrice = existingItem.priceEach * existingItem.count;
              modificationMessage = `I've added ${count} more ${itemName} to the list.`;
            } else {
              const priceEach = OBJECT_PRICE_MAPPING[itemName.toLowerCase()] || 0;
              modifiedItems.push({
                name: itemName,
                count: parseInt(count),
                priceEach,
                totalPrice: priceEach * parseInt(count)
              });
              modificationMessage = `I've added ${count} ${itemName} to the list${priceEach > 0 ? ` with an estimated value of $${(priceEach * parseInt(count)).toLocaleString()} each` : ''}.`;
            }
          } else if (removeMatch) {
            const [, itemName] = removeMatch;
            const itemIndex = modifiedItems.findIndex((item: AggregatedItem) => 
              item.name.toLowerCase() === itemName.toLowerCase()
            );

            if (itemIndex !== -1) {
              modifiedItems.splice(itemIndex, 1);
              modificationMessage = `I've removed ${itemName} from the list.`;
            } else {
              modificationMessage = `I couldn't find ${itemName} in the current list.`;
            }
          }

          // Update the aggregated items
          const totalCost = modifiedItems.reduce((sum: number, item: AggregatedItem) => sum + item.totalPrice, 0);
          setAggregatedItems(modifiedItems, totalCost);

          // Format the list for display
          const formattedList = modifiedItems.map(item => 
            `${item.name}: ${item.count} x $${item.priceEach.toLocaleString()} = $${item.totalPrice.toLocaleString()}`
          ).join('\n');

          // Send the modification message to the chat
          await append({ 
            content: `${modificationMessage}\n\nHere's the updated list:\n${formattedList}\n\nTotal value: $${totalCost.toLocaleString()}`,
            role: 'assistant' 
          });

          response = {
            action,
            content: modificationMessage,
            reasoning: 'Modified items and updated list',
            confidence: 0.9
          };
          break;
        }

        default: {
          // For any other action type, use the LLM
          const userMessage = { content: action.payload.input, role: 'user' as const };
          await append(userMessage);
          
          // Wait for the LLM response
          const llmResponse = await new Promise<string>((resolve) => {
            const checkResponse = () => {
              if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
                resolve(messages[messages.length - 1].content);
              } else {
                setTimeout(checkResponse, 100);
              }
            };
            checkResponse();
          });

          response = {
            action,
            content: llmResponse,
            reasoning: 'Using LLM for natural language response',
            confidence: 0.9
          };
        }
      }

      setAgentState(prev => ({ ...prev, status: 'idle' }));
      return response;
    } catch (error) {
      setAgentState(prev => ({ ...prev, status: 'idle' }));
      throw error;
    }
  }, [setDetectionResults, setAggregatedItems, append, messages]);

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