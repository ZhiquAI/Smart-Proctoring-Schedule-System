// Web Worker for scheduling algorithm
import { Teacher, Schedule, Session, Assignment, SpecialTask, HistoricalStats } from '../types';

interface WorkerMessage {
  type: string;
  payload: any;
}

interface SchedulingParams {
  teachers: Teacher[];
  schedules: Schedule[];
  sessions: Session[];
  specialTasks: SpecialTask;
  teacherExclusions: [string, string[]][];
  historicalStats: HistoricalStats;
}

// Convert teacherExclusions array back to Map
function convertExclusionsToMap(exclusionsArray: [string, string[]][]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  exclusionsArray.forEach(([teacher, exclusions]) => {
    map.set(teacher, new Set(exclusions));
  });
  return map;
}

// Improved scheduling algorithm implementation
function generateSchedulingAssignments(params: SchedulingParams): Assignment[] {
  const { teachers, schedules, sessions, specialTasks, teacherExclusions: exclusionsArray, historicalStats } = params;
  const teacherExclusions = convertExclusionsToMap(exclusionsArray);
  
  const assignments: Assignment[] = [];
  let assignmentId = 0;

  // Send progress update
  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 10, message: '正在分析教师可用性...' }
  });

  // Track assigned slots to avoid duplicates
  const assignedSlots = new Set<string>();

  // Process forced assignments first
  specialTasks.forced.forEach(forced => {
    const session = sessions.find(s => s.id === forced.sessionId);
    if (session) {
      const slotKey = `${forced.sessionId}_${forced.location}`;
      assignments.push({
        id: `assignment_${assignmentId++}`,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        location: forced.location,
        teacher: forced.teacher,
        assignedBy: 'forced'
      });
      assignedSlots.add(slotKey);
    }
  });

  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 30, message: '正在处理指定监考...' }
  });

  // Process designated assignments
  specialTasks.designated.forEach(designated => {
    const session = sessions.find(s => s.id === designated.slotId);
    if (session) {
      const slotKey = `${designated.slotId}_${designated.location}`;
      if (!assignedSlots.has(slotKey)) {
        assignments.push({
          id: `assignment_${assignmentId++}`,
          date: designated.date,
          startTime: session.startTime,
          endTime: session.endTime,
          location: designated.location,
          teacher: designated.teacher,
          assignedBy: 'designated'
        });
        assignedSlots.add(slotKey);
      }
    }
  });

  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 50, message: '正在计算最优分配方案...' }
  });

  // Calculate teacher workload from historical data
  const teacherWorkload = new Map<string, number>();
  teachers.forEach(teacher => {
    const historical = historicalStats[teacher.name] || { count: 0, duration: 0 };
    teacherWorkload.set(teacher.name, historical.duration);
  });

  // Count total required assignments
  let totalRequired = 0;
  let processedCount = 0;

  sessions.forEach(session => {
    session.slots.forEach(slot => {
      totalRequired += slot.required;
    });
  });

  // Process all remaining slots that need assignments
  sessions.forEach(session => {
    session.slots.forEach(slot => {
      const slotKey = `${session.id}_${slot.location}`;
      
      // Check how many teachers are already assigned to this slot
      const existingAssignments = assignments.filter(a => 
        a.date === session.date &&
        a.startTime === session.startTime &&
        a.endTime === session.endTime &&
        a.location === slot.location
      ).length;

      // Assign remaining teachers needed for this slot
      const remainingNeeded = slot.required - existingAssignments;
      
      for (let i = 0; i < remainingNeeded; i++) {
        // Find available teacher
        const availableTeachers = teachers.filter(teacher => {
          // Check if teacher is already assigned to this exact slot
          const alreadyAssignedToSlot = assignments.some(a =>
            a.teacher === teacher.name &&
            a.date === session.date &&
            a.startTime === session.startTime &&
            a.endTime === session.endTime &&
            a.location === slot.location
          );

          if (alreadyAssignedToSlot) {
            return false;
          }

          // Check exclusions
          const exclusions = teacherExclusions.get(teacher.name);
          if (exclusions) {
            if (exclusions.has(`${session.id}_all`) || exclusions.has(`${session.id}_${slot.location}`)) {
              return false;
            }
          }

          // Check time conflicts with other assignments
          const hasTimeConflict = assignments.some(existing => 
            existing.teacher === teacher.name &&
            existing.date === session.date &&
            timeOverlap(
              existing.startTime, existing.endTime,
              session.startTime, session.endTime
            )
          );

          return !hasTimeConflict;
        });

        if (availableTeachers.length > 0) {
          // Sort by workload (ascending) to balance load
          availableTeachers.sort((a, b) => 
            (teacherWorkload.get(a.name) || 0) - (teacherWorkload.get(b.name) || 0)
          );

          const selectedTeacher = availableTeachers[0];
          
          assignments.push({
            id: `assignment_${assignmentId++}`,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            location: slot.location,
            teacher: selectedTeacher.name,
            assignedBy: 'auto'
          });

          // Update workload
          const duration = calculateDuration(session.startTime, session.endTime);
          teacherWorkload.set(selectedTeacher.name, 
            (teacherWorkload.get(selectedTeacher.name) || 0) + duration
          );
        } else {
          // No available teacher - create error assignment
          assignments.push({
            id: `assignment_${assignmentId++}`,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            location: slot.location,
            teacher: `!!无可用教师-${slot.location}`,
            assignedBy: 'auto'
          });
        }

        processedCount++;
        const progress = 50 + (processedCount / totalRequired) * 40;
        
        if (processedCount % 3 === 0 || processedCount === totalRequired) {
          self.postMessage({
            type: 'PROGRESS',
            payload: { 
              progress: Math.round(progress), 
              message: `正在分配监考任务 ${processedCount}/${totalRequired}...` 
            }
          });
        }
      }
    });
  });

  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 95, message: '正在验证分配结果...' }
  });

  return assignments;
}

// Helper functions
function timeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  
  return s1 < e2 && s2 < e1;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function calculateDuration(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'GENERATE_ASSIGNMENTS':
        self.postMessage({
          type: 'PROGRESS',
          payload: { progress: 0, message: '开始智能分配...' }
        });

        const assignments = generateSchedulingAssignments(payload);
        
        self.postMessage({
          type: 'PROGRESS',
          payload: { progress: 100, message: '分配完成!' }
        });

        self.postMessage({
          type: 'ASSIGNMENTS_GENERATED',
          payload: assignments
        });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};

// Export for TypeScript
export {};