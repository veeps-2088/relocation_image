export type AgentRole = 'planner' | 'executor' | 'validator' | 'memory_manager';

export interface AgentCapability {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AgentMemory {
  shortTerm: {
    currentTask: string;
    context: Record<string, any>;
  };
  longTerm: {
    pastTasks: string[];
    learnedPatterns: Record<string, any>;
  };
}

export interface AgentState {
  role: AgentRole;
  capabilities: AgentCapability[];
  memory: AgentMemory;
  currentPlan: string[];
  status: 'idle' | 'planning' | 'executing' | 'validating';
  messages: Message[];
  currentAction: AgentAction | null;
  isProcessing: boolean;
}

export interface AgentAction {
  type: string;
  payload: any;
  timestamp: number;
}

export interface AgentResponse {
  action: AgentAction;
  reasoning: string;
  confidence: number;
  detectionResults?: Array<{
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
  }>;
  summary?: {
    items: Array<{
      name: string;
      count: number;
      priceEach: number;
      totalPrice: number;
    }>;
    totalCost: number;
  };
  analysis?: {
    intent: 'image_analysis' | 'text_query';
    requiresImages: boolean;
    requiresCostEstimation: boolean;
  };
  items?: any[];
  totalCost?: number;
}

export interface AgentContext {
  userInput: string;
  systemState: Record<string, any>;
  availableTools: string[];
  imageUrls?: string[];
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  imageUrls?: string[];
  detectionResults?: Array<{
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
  }>;
}

export interface DetectionResult {
  label: string;
  confidence: number;
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

export interface CostEstimation {
  totalCost: number;
  items: Array<{
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
}

export interface AgentContextType {
  state: AgentState;
  dispatch: React.Dispatch<AgentAction>;
} 