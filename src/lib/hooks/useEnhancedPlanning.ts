import { useAgentPlanning } from './useAgentPlanning';
import { useDetection } from '../contexts/DetectionContext';
import { AgentAction } from '../types/agent';

export function useEnhancedPlanning() {
  const { plan, executeAction } = useAgentPlanning();
  const { 
    detectionResults, 
    aggregatedItems, 
    totalCost,
    getLastUserMessage,
    getLastAssistantMessage 
  } = useDetection();

  const enhancedPlan = async (input: string, imageUrls?: string[]) => {
    const lastUserMessage = getLastUserMessage();
    const lastAssistantMessage = getLastAssistantMessage();

    // Build context from previous messages and current state
    const context = {
      hasDetectionResults: detectionResults.length > 0,
      detectionResults,
      aggregatedItems,
      totalCost,
      lastUserMessage,
      lastAssistantMessage,
      currentInput: input
    };

    // Normalize the input for better matching
    const normalizedInput = input.toLowerCase().trim();
    
    // Define question patterns and their corresponding actions
    const questionPatterns = [
      {
        pattern: /(most expensive|highest value|most valuable)/i,
        action: 'analyze_costs',
        priority: 1
      },
      {
        pattern: /(how many|count of|number of|total items)/i,
        action: 'analyze_items',
        priority: 1
      },
      {
        pattern: /(pack|move|transport|prepare|ship|deliver)/i,
        action: 'moving_advice',
        priority: 1
      },
      {
        pattern: /(add|remove|update|change|modify|delete)/i,
        action: 'modify_items',
        priority: 1
      },
      {
        pattern: /(cost|price|value|worth|budget)/i,
        action: 'analyze_costs',
        priority: 2
      },
      {
        pattern: /(item|object|furniture|sofa|chair|table|bed|electronic|appliance)/i,
        action: 'analyze_items',
        priority: 2
      },
      {
        pattern: /(what about|how about|and|also|what else|anything else)/i,
        action: 'follow_up',
        priority: 2
      }
    ];

    // Find matching patterns and sort by priority
    const matchingPatterns = questionPatterns
      .filter(({ pattern }) => pattern.test(normalizedInput))
      .sort((a, b) => b.priority - a.priority);

    let actions: AgentAction[] = [];

    if (matchingPatterns.length > 0) {
      // Get the highest priority action
      const primaryAction = matchingPatterns[0].action;
      
      // Create the primary action
      actions.push({
        type: primaryAction,
        payload: { input, context },
        timestamp: Date.now()
      });

      // If there are multiple matches, create additional actions for context
      if (matchingPatterns.length > 1) {
        const secondaryActions = matchingPatterns
          .slice(1)
          .filter(({ action }) => action !== primaryAction)
          .map(({ action }) => ({
            type: action,
            payload: { input, context },
            timestamp: Date.now()
          }));
        
        actions.push(...secondaryActions);
      }
    } else {
      // If no patterns match, use the general planning system
      actions = await plan(input, imageUrls);
    }

    return actions;
  };

  return {
    plan: enhancedPlan,
    executeAction
  };
} 