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

export interface Assignment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  teacher: string;
  assignedBy: 'auto' | 'manual' | 'designated' | 'forced';
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

export interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  slots: Slot[];
}

export interface Slot {
  location: string;
  required: number;
}

export interface HistoricalStats {
  [teacherName: string]: {
    count: number;
    duration: number;
  };
}

export interface TeacherStats {
  name: string;
  current: {
    count: number;
    duration: number;
  };
  total: {
    count: number;
    duration: number;
  };
  department?: string;
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  field?: string;
}

export interface Conflict {
  type: 'time' | 'location' | 'rule' | 'allocation';
  description: string;
  severity: 'high' | 'medium' | 'low';
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