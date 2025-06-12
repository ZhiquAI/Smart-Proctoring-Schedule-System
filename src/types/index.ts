export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIContext {
  task?: 'UPDATE_RULES' | 'ANALYZE_CONFLICT' | 'GENERATE_SCHEDULE' | 'EXPLAIN_RULES';
  currentRules?: SpecialTask;
  conflictInfo?: any;
  teachers?: any[];
  schedules?: any[];
  userIntent?: string;
}

export interface AIResponse {
  textResponse: string;
  updatedRules?: SpecialTask;
  confidence: number;
}

export interface AIRequest {
  messages: AIMessage[];
  context: AIContext;
}

export interface SpecialTask {
  designated: Array<{
    teacher: string;
    date: string;
    slotId: string;
    location: string;
  }>;
  forced: Array<{
    sessionId: string;
    location: string;
    teacher: string;
  }>;
}