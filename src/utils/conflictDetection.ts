import { Assignment, Teacher, Conflict } from '../types';

export const detectConflicts = (
  assignments: Assignment[],
  teachers: Teacher[],
  teacherExclusions: Map<string, Set<string>>
): Conflict[] => {
  const conflicts: Conflict[] = [];

  // Detect error assignments
  assignments.forEach(assignment => {
    if (assignment.teacher.startsWith('!!')) {
      const severity = assignment.teacher.includes('冲突') ? 'high' : 'medium';
      conflicts.push({
        type: 'allocation',
        description: `${assignment.teacher} (考场: ${assignment.location}, 时间: ${assignment.date} ${assignment.startTime})`,
        severity: severity as 'high' | 'medium'
      });
    }
  });

  // Group assignments by teacher
  const teacherSchedules = new Map<string, Assignment[]>();
  assignments.forEach(assignment => {
    if (!assignment.teacher.startsWith('!!')) {
      if (!teacherSchedules.has(assignment.teacher)) {
        teacherSchedules.set(assignment.teacher, []);
      }
      teacherSchedules.get(assignment.teacher)!.push(assignment);
    }
  });

  // Check for time conflicts
  teacherSchedules.forEach((schedule, teacher) => {
    schedule.sort((a, b) => new Date(`${a.date} ${a.startTime}`).getTime() - new Date(`${b.date} ${b.startTime}`).getTime());
    
    for (let i = 0; i < schedule.length - 1; i++) {
      const current = schedule[i];
      const next = schedule[i + 1];
      
      if (current.date === next.date) {
        const currentEnd = new Date(`${current.date} ${current.endTime}`);
        const nextStart = new Date(`${next.date} ${next.startTime}`);
        
        if (currentEnd > nextStart) {
          conflicts.push({
            type: 'time',
            description: `${teacher} 在 ${current.date} 有时间重叠的任务: ${current.startTime}-${current.endTime} (考场 ${current.location}) 和 ${next.startTime}-${next.endTime} (考场 ${next.location})`,
            severity: 'high'
          });
        }
      }
    }

    // Check for location conflicts
    const locationMap = new Map<string, number>();
    schedule.forEach(assignment => {
      locationMap.set(assignment.location, (locationMap.get(assignment.location) || 0) + 1);
    });

    locationMap.forEach((count, location) => {
      if (count > 1) {
        conflicts.push({
          type: 'location',
          description: `${teacher} 被多次安排在考场 ${location}`,
          severity: 'medium'
        });
      }
    });

    // Check rule violations
    const exclusions = teacherExclusions.get(teacher);
    if (exclusions) {
      schedule.forEach(assignment => {
        const sessionId = `${assignment.date}_${assignment.startTime}_${assignment.endTime}`;
        if (exclusions.has(`${sessionId}_all`) || exclusions.has(`${sessionId}_${assignment.location}`)) {
          conflicts.push({
            type: 'rule',
            description: `${teacher} 被安排在了一个已排除的场次: ${assignment.date} ${assignment.startTime}-${assignment.endTime} (考场 ${assignment.location})`,
            severity: 'high'
          });
        }
      });
    }
  });

  return conflicts;
};