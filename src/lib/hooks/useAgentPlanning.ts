import { useState, useCallback } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { AgentAction, AgentResponse } from '../types/agent';

export function useAgentPlanning() {
  const { agentState, executeAction: executeAgentAction, updateContext } = useAgent();
  const [isPlanning, setIsPlanning] = useState(false);

  const plan = useCallback(async (userInput: string, imageUrls?: string[]): Promise<AgentAction[]> => {
    setIsPlanning(true);
    try {
      // Update context with new user input and image URLs
      updateContext({ 
        userInput,
        imageUrls: imageUrls || agentState.memory.shortTerm.context.imageUrls
      });

      // Create initial plan
      const planAction: AgentAction = {
        type: 'update_plan',
        payload: {
          steps: [
            'analyze_user_input',
            'detect_objects_in_images',
            'estimate_costs',
            'generate_response'
          ]
        },
        timestamp: Date.now()
      };

      await executeAgentAction(planAction);

      // Convert plan steps to actions
      const actions: AgentAction[] = agentState.currentPlan.map(step => {
        switch (step) {
          case 'analyze_user_input':
            return {
              type: 'analyze_input',
              payload: { input: userInput },
              timestamp: Date.now()
            };
          case 'detect_objects_in_images':
            return {
              type: 'detect_objects',
              payload: { imageUrls: imageUrls || agentState.memory.shortTerm.context.imageUrls },
              timestamp: Date.now()
            };
          case 'estimate_costs':
            return {
              type: 'estimate_costs',
              payload: { 
                items: agentState.memory.shortTerm.context.detectedObjects || [],
                prices: agentState.memory.shortTerm.context.prices || {}
              },
              timestamp: Date.now()
            };
          case 'generate_response':
            return {
              type: 'generate_response',
              payload: {
                context: agentState.memory.shortTerm.context,
                summary: agentState.memory.shortTerm.context.summary
              },
              timestamp: Date.now()
            };
          default:
            throw new Error(`Unknown plan step: ${step}`);
        }
      });

      return actions;
    } catch (error) {
      console.error('Planning error:', error);
      throw error;
    } finally {
      setIsPlanning(false);
    }
  }, [agentState, executeAgentAction, updateContext]);

  const executeAction = useCallback(async (action: AgentAction): Promise<AgentResponse> => {
    try {
      const response = await executeAgentAction(action);
      
      // Update context with response
      updateContext({
        systemState: {
          ...agentState.memory.shortTerm.context,
          [action.type]: response
        }
      });

      return response;
    } catch (error) {
      console.error('Action execution error:', error);
      throw error;
    }
  }, [agentState, executeAgentAction, updateContext]);

  return {
    isPlanning,
    plan,
    executeAction
  };
} 