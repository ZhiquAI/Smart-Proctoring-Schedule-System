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

export interface Assignment {
  id: string;
  teacher: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  required: number;
  assignedBy: 'auto' | 'designated' | 'forced' | 'manual';
  type?: string;
}

export interface TeacherExclusion {
  teacher: string;
  sessionId: string;
  location?: string;
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

export interface TeacherStats {
  name: string;
  current: { count: number; duration: number };
  total: { count: number; duration: number };
  department?: string;
}

export interface HistoricalStats {
  [teacherName: string]: {
    count: number;
    duration: number;
  };
}