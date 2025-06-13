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

// Improved scheduling algorithm - Day-first approach
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

  // Calculate teacher workload from historical data
  const teacherWorkload = new Map<string, number>();
  teachers.forEach(teacher => {
    const historical = historicalStats[teacher.name] || { count: 0, duration: 0 };
    teacherWorkload.set(teacher.name, historical.duration);
  });

  // Group sessions by date and sort by date
  const sessionsByDate = new Map<string, Session[]>();
  sessions.forEach(session => {
    if (!sessionsByDate.has(session.date)) {
      sessionsByDate.set(session.date, []);
    }
    sessionsByDate.get(session.date)!.push(session);
  });

  // Sort dates chronologically
  const sortedDates = Array.from(sessionsByDate.keys()).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  // Sort sessions within each date by start time
  sortedDates.forEach(date => {
    const sessionsForDate = sessionsByDate.get(date)!;
    sessionsForDate.sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
  });

  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 20, message: '正在处理强制分配...' }
  });

  // Process forced assignments first
  sortedDates.forEach(date => {
    const sessionsForDate = sessionsByDate.get(date)!;
    
    sessionsForDate.forEach(session => {
      specialTasks.forced
        .filter(forced => forced.sessionId === session.id)
        .forEach(forced => {
          assignments.push({
            id: `assignment_${assignmentId++}`,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            location: forced.location,
            teacher: forced.teacher,
            assignedBy: 'forced'
          });
          
          // Update workload
          const duration = calculateDuration(session.startTime, session.endTime);
          teacherWorkload.set(forced.teacher, 
            (teacherWorkload.get(forced.teacher) || 0) + duration
          );
        });
    });
  });

  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 30, message: '正在处理指定监考...' }
  });

  // Process designated assignments
  sortedDates.forEach(date => {
    const sessionsForDate = sessionsByDate.get(date)!;
    
    sessionsForDate.forEach(session => {
      specialTasks.designated
        .filter(designated => designated.slotId === session.id)
        .forEach(designated => {
          // Check if this slot is not already assigned
          const alreadyAssigned = assignments.some(a =>
            a.date === session.date &&
            a.startTime === session.startTime &&
            a.endTime === session.endTime &&
            a.location === designated.location
          );
          
          if (!alreadyAssigned) {
            assignments.push({
              id: `assignment_${assignmentId++}`,
              date: designated.date,
              startTime: session.startTime,
              endTime: session.endTime,
              location: designated.location,
              teacher: designated.teacher,
              assignedBy: 'designated'
            });
            
            // Update workload
            const duration = calculateDuration(session.startTime, session.endTime);
            teacherWorkload.set(designated.teacher, 
              (teacherWorkload.get(designated.teacher) || 0) + duration
            );
          }
        });
    });
  });

  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 50, message: '开始按天优先分配...' }
  });

  // Main assignment logic - Process day by day with priority on completing each day
  sortedDates.forEach((date, dateIndex) => {
    const sessionsForDate = sessionsByDate.get(date)!;
    
    self.postMessage({
      type: 'PROGRESS',
      payload: { 
        progress: 50 + (dateIndex / sortedDates.length) * 40, 
        message: `正在优先安排第 ${dateIndex + 1} 天 (${date})...` 
      }
    });

    // For each day, process sessions in chronological order
    sessionsForDate.forEach(session => {
      // Collect all unassigned slots for this session
      const unassignedSlots: Array<{location: string, needed: number}> = [];
      
      session.slots.forEach(slot => {
        const existingAssignments = assignments.filter(a => 
          a.date === session.date &&
          a.startTime === session.startTime &&
          a.endTime === session.endTime &&
          a.location === slot.location
        ).length;

        const remainingNeeded = slot.required - existingAssignments;
        if (remainingNeeded > 0) {
          unassignedSlots.push({
            location: slot.location,
            needed: remainingNeeded
          });
        }
      });

      // Assign teachers to each unassigned slot
      unassignedSlots.forEach(slotInfo => {
        for (let i = 0; i < slotInfo.needed; i++) {
          const availableTeachers = getAvailableTeachers(
            teachers, 
            session, 
            slotInfo.location, 
            assignments, 
            teacherExclusions
          );

          if (availableTeachers.length > 0) {
            // Sort by workload for fair distribution
            availableTeachers.sort((a, b) => {
              const workloadA = teacherWorkload.get(a.name) || 0;
              const workloadB = teacherWorkload.get(b.name) || 0;
              
              // If workload is similar, prefer teachers with fewer assignments today
              if (Math.abs(workloadA - workloadB) < 60) { // Within 1 hour difference
                const todayAssignmentsA = assignments.filter(assign => 
                  assign.teacher === a.name && assign.date === date
                ).length;
                const todayAssignmentsB = assignments.filter(assign => 
                  assign.teacher === b.name && assign.date === date
                ).length;
                
                return todayAssignmentsA - todayAssignmentsB;
              }
              
              return workloadA - workloadB;
            });

            const selectedTeacher = availableTeachers[0];
            
            assignments.push({
              id: `assignment_${assignmentId++}`,
              date: session.date,
              startTime: session.startTime,
              endTime: session.endTime,
              location: slotInfo.location,
              teacher: selectedTeacher.name,
              assignedBy: 'auto'
            });

            // Update workload
            const duration = calculateDuration(session.startTime, session.endTime);
            teacherWorkload.set(selectedTeacher.name, 
              (teacherWorkload.get(selectedTeacher.name) || 0) + duration
            );
          } else {
            // No available teachers - create error assignment
            assignments.push({
              id: `assignment_${assignmentId++}`,
              date: session.date,
              startTime: session.startTime,
              endTime: session.endTime,
              location: slotInfo.location,
              teacher: `!!人员不足-${slotInfo.location}`,
              assignedBy: 'auto'
            });
          }
        }
      });
    });
  });

  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 90, message: '正在验证分配结果...' }
  });

  // Final validation
  const validationResult = validateAssignments(assignments, teachers, teacherExclusions);
  
  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 95, message: '分配完成，正在生成报告...' }
  });

  return assignments;
}

// Helper function to get available teachers for a specific slot
function getAvailableTeachers(
  teachers: Teacher[],
  session: Session,
  location: string,
  assignments: Assignment[],
  teacherExclusions: Map<string, Set<string>>
): Teacher[] {
  return teachers.filter(teacher => {
    // Check if teacher is already assigned to this exact slot
    const alreadyAssignedToSlot = assignments.some(a =>
      a.teacher === teacher.name &&
      a.date === session.date &&
      a.startTime === session.startTime &&
      a.endTime === session.endTime &&
      a.location === location
    );

    if (alreadyAssignedToSlot) {
      return false;
    }

    // Check exclusions
    const exclusions = teacherExclusions.get(teacher.name);
    if (exclusions) {
      if (exclusions.has(`${session.id}_all`) || exclusions.has(`${session.id}_${location}`)) {
        return false;
      }
    }

    // Check if teacher is already assigned to ANY location at this time (one location per time slot rule)
    const hasTimeConflict = assignments.some(existing => 
      existing.teacher === teacher.name &&
      existing.date === session.date &&
      existing.startTime === session.startTime &&
      existing.endTime === session.endTime
    );

    return !hasTimeConflict;
  });
}

// Validation function
function validateAssignments(
  assignments: Assignment[], 
  teachers: Teacher[], 
  teacherExclusions: Map<string, Set<string>>
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for time conflicts - one teacher cannot be in multiple locations at the same time
  const teacherSchedules = new Map<string, Assignment[]>();
  assignments.forEach(assignment => {
    if (!assignment.teacher.startsWith('!!')) {
      if (!teacherSchedules.has(assignment.teacher)) {
        teacherSchedules.set(assignment.teacher, []);
      }
      teacherSchedules.get(assignment.teacher)!.push(assignment);
    }
  });

  teacherSchedules.forEach((schedule, teacher) => {
    schedule.sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
    
    for (let i = 0; i < schedule.length - 1; i++) {
      const current = schedule[i];
      const next = schedule[i + 1];
      
      // Check for exact time overlap (same time slot, different locations)
      if (current.date === next.date && 
          current.startTime === next.startTime &&
          current.endTime === next.endTime &&
          current.location !== next.location) {
        issues.push(`${teacher} 在 ${current.date} ${current.startTime}-${current.endTime} 被分配到多个考场: ${current.location} 和 ${next.location}`);
      }
      
      // Check for general time overlap
      if (current.date === next.date && 
          timeOverlap(current.startTime, current.endTime, next.startTime, next.endTime)) {
        issues.push(`${teacher} 在 ${current.date} 有时间冲突: ${current.startTime}-${current.endTime} (${current.location}) 和 ${next.startTime}-${next.endTime} (${next.location})`);
      }
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
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