'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AgentState, AgentAction, AgentContext as AgentContextType, AgentResponse } from '../types/agent';

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

export function AgentContextProvider({ children }: AgentContextProviderProps) {
  const [agentState, setAgentState] = useState<AgentState>(initialAgentState);
  const [context, setContext] = useState<AgentContextType>({
    userInput: '',
    systemState: {},
    availableTools: ['object_detection', 'cost_estimation', 'planning']
  });

  const updateContext = useCallback((newContext: Partial<AgentContextType>) => {
    setContext(prev => ({ ...prev, ...newContext }));
  }, []);

  const executeAction = useCallback(async (action: AgentAction): Promise<AgentResponse> => {
    try {
      // Update agent state to executing
      setAgentState(prev => ({ ...prev, status: 'executing' }));

      // Execute the action based on type
      let response: AgentResponse;
      
      switch (action.type) {
        case 'analyze_input':
          // Analyze the input to determine intent and required actions
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
          // Calculate costs based on detected items
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
          // Update the current plan
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

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Update agent state back to idle
      setAgentState(prev => ({ ...prev, status: 'idle' }));

      return response;
    } catch (error) {
      // Handle errors and update state
      setAgentState(prev => ({ ...prev, status: 'idle' }));
      throw error;
    }
  }, []);

  return (
    <AgentContext.Provider value={{ agentState, executeAction, updateContext }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentContextProvider');
  }
  return context;
} 