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

// Check if two locations are adjacent (can be supervised jointly)
function areLocationsAdjacent(loc1: string, loc2: string): boolean {
  // Extract numbers from location strings (e.g., "A101" -> 101)
  const getLocationNumber = (loc: string): number => {
    const match = loc.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  
  // Extract building prefix (e.g., "A101" -> "A")
  const getLocationPrefix = (loc: string): string => {
    const match = loc.match(/^([A-Za-z]+)/);
    return match ? match[1] : '';
  };
  
  const prefix1 = getLocationPrefix(loc1);
  const prefix2 = getLocationPrefix(loc2);
  const num1 = getLocationNumber(loc1);
  const num2 = getLocationNumber(loc2);
  
  // Same building and adjacent room numbers
  return prefix1 === prefix2 && Math.abs(num1 - num2) <= 2;
}

// Improved scheduling algorithm - Day-first with joint supervision
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

    // For each day, we need to ensure ALL sessions are covered
    // Process each session in chronological order within the day
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

      // Strategy 1: Try to assign individual teachers to each slot
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
              
              if (workloadA === workloadB) {
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
          }
        }
      });

      // Strategy 2: For remaining unassigned slots, try joint supervision
      const stillUnassigned = unassignedSlots.filter(slotInfo => {
        const currentAssignments = assignments.filter(a => 
          a.date === session.date &&
          a.startTime === session.startTime &&
          a.endTime === session.endTime &&
          a.location === slotInfo.location
        ).length;
        
        const originalSlot = session.slots.find(s => s.location === slotInfo.location);
        return currentAssignments < (originalSlot?.required || 1);
      });

      if (stillUnassigned.length > 0) {
        // Try to find teachers who can supervise multiple adjacent locations
        stillUnassigned.forEach(slotInfo => {
          const originalSlot = session.slots.find(s => s.location === slotInfo.location);
          const stillNeeded = (originalSlot?.required || 1) - assignments.filter(a => 
            a.date === session.date &&
            a.startTime === session.startTime &&
            a.endTime === session.endTime &&
            a.location === slotInfo.location
          ).length;

          for (let i = 0; i < stillNeeded; i++) {
            // Find teachers who might be able to do joint supervision
            const availableForJoint = getAvailableTeachers(
              teachers, 
              session, 
              slotInfo.location, 
              assignments, 
              teacherExclusions
            );

            if (availableForJoint.length > 0) {
              // Check if this teacher can supervise adjacent locations
              const selectedTeacher = availableForJoint[0];
              
              // Find adjacent unassigned locations
              const adjacentUnassigned = stillUnassigned.filter(other => 
                other.location !== slotInfo.location &&
                areLocationsAdjacent(slotInfo.location, other.location)
              );

              if (adjacentUnassigned.length > 0) {
                // Assign teacher to multiple adjacent locations (joint supervision)
                assignments.push({
                  id: `assignment_${assignmentId++}`,
                  date: session.date,
                  startTime: session.startTime,
                  endTime: session.endTime,
                  location: slotInfo.location,
                  teacher: `${selectedTeacher.name} (联排)`,
                  assignedBy: 'auto'
                });

                // Also assign to adjacent location
                const adjacentLocation = adjacentUnassigned[0];
                assignments.push({
                  id: `assignment_${assignmentId++}`,
                  date: session.date,
                  startTime: session.startTime,
                  endTime: session.endTime,
                  location: adjacentLocation.location,
                  teacher: `${selectedTeacher.name} (联排)`,
                  assignedBy: 'auto'
                });

                // Update workload (count as 1.5x normal workload for joint supervision)
                const duration = calculateDuration(session.startTime, session.endTime);
                teacherWorkload.set(selectedTeacher.name, 
                  (teacherWorkload.get(selectedTeacher.name) || 0) + duration * 1.5
                );
              } else {
                // Regular single assignment
                assignments.push({
                  id: `assignment_${assignmentId++}`,
                  date: session.date,
                  startTime: session.startTime,
                  endTime: session.endTime,
                  location: slotInfo.location,
                  teacher: selectedTeacher.name,
                  assignedBy: 'auto'
                });

                const duration = calculateDuration(session.startTime, session.endTime);
                teacherWorkload.set(selectedTeacher.name, 
                  (teacherWorkload.get(selectedTeacher.name) || 0) + duration
                );
              }
            } else {
              // Last resort: create error assignment
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
      }
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

    // Check time conflicts with other assignments on the same day
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
}

// Validation function
function validateAssignments(
  assignments: Assignment[], 
  teachers: Teacher[], 
  teacherExclusions: Map<string, Set<string>>
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for time conflicts (excluding joint supervision)
  const teacherSchedules = new Map<string, Assignment[]>();
  assignments.forEach(assignment => {
    if (!assignment.teacher.startsWith('!!')) {
      // Extract base teacher name (remove joint supervision marker)
      const baseTeacherName = assignment.teacher.replace(' (联排)', '');
      
      if (!teacherSchedules.has(baseTeacherName)) {
        teacherSchedules.set(baseTeacherName, []);
      }
      teacherSchedules.get(baseTeacherName)!.push(assignment);
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
      
      // Skip if both are joint supervision at the same time (this is allowed)
      if (current.date === next.date && 
          current.startTime === next.startTime &&
          current.endTime === next.endTime &&
          current.teacher.includes('(联排)') &&
          next.teacher.includes('(联排)')) {
        continue;
      }
      
      if (current.date === next.date && 
          timeOverlap(current.startTime, current.endTime, next.startTime, next.endTime)) {
        issues.push(`${teacher} 在 ${current.date} 有时间冲突`);
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