import { useAgentPlanning } from './useAgentPlanning';
import { useDetection } from '../contexts/DetectionContext';
import { AgentAction } from '../types/agent';

export function useEnhancedPlanning() {
  const { plan, executeAction } = useAgentPlanning();
  const { detectionResults, aggregatedItems, totalCost } = useDetection();

  const enhancedPlan = async (input: string, imageUrls?: string[]) => {
    // If we have detection results, include them in the context
    const context = {
      hasDetectionResults: detectionResults.length > 0,
      detectionResults,
      aggregatedItems,
      totalCost,
    };

    // Analyze the input to determine the type of request
    const isCostQuestion = /cost|price|expensive|cheap|budget/i.test(input);
    const isItemQuestion = /item|object|furniture|sofa|chair|table|bed/i.test(input);
    const isMovingQuestion = /move|pack|transport|prepare/i.test(input);
    const isModificationRequest = /add|remove|update|change|modify/i.test(input);

    let actions: AgentAction[] = [];

    if (isCostQuestion) {
      actions.push({
        type: 'analyze_costs',
        payload: { input, context },
        timestamp: Date.now()
      });
    } else if (isItemQuestion) {
      actions.push({
        type: 'analyze_items',
        payload: { input, context },
        timestamp: Date.now()
      });
    } else if (isMovingQuestion) {
      actions.push({
        type: 'moving_advice',
        payload: { input, context },
        timestamp: Date.now()
      });
    } else if (isModificationRequest) {
      actions.push({
        type: 'modify_items',
        payload: { input, context },
        timestamp: Date.now()
      });
    } else {
      // Default to general planning if no specific type is detected
      actions = await plan(input, imageUrls);
    }

    return actions;
  };

  return {
    plan: enhancedPlan,
    executeAction
  };
} 