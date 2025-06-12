export interface Teacher {
  id: string;
  name: string;
  department?: string;
  email?: string;
  phone?: string;
}

export interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  required: number;
  type?: 'exam' | 'meeting' | 'other';
}

export interface SpecialTask {
  designated: DesignatedTask[];
  forced: ForcedTask[];
}

export interface DesignatedTask {
  teacher: string;
  date: string;
  slotId: string;
  location: string;
}

export interface ForcedTask {
  sessionId: string;
  location: string;
  teacher: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface AIContext {
  task: 'UPDATE_RULES' | 'ANALYZE_CONFLICT' | 'GENERATE_SCHEDULE' | 'EXPLAIN_RULES';
  currentRules?: SpecialTask;
  teachers?: Teacher[];
  schedules?: Schedule[];
  conflictInfo?: any;
  userIntent?: string;
}

export interface AIResponse {
  textResponse: string;
  updatedRules?: SpecialTask;
  suggestions?: string[];
  confidence?: number;
}