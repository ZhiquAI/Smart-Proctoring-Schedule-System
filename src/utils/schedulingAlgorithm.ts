import { Teacher, Schedule, Session, Assignment, SpecialTask, HistoricalStats } from '../types';

interface SchedulingParams {
  teachers: Teacher[];
  schedules: Schedule[];
  sessions: Session[];
  specialTasks: SpecialTask;
  teacherExclusions: Map<string, Set<string>>;
  historicalStats: HistoricalStats;
}

export const generateOptimalAssignments = async (params: SchedulingParams): Promise<Assignment[]> => {
  const { teachers, schedules, specialTasks, teacherExclusions, historicalStats } = params;
  
  // Initialize teacher workload tracking
  const teacherWorkload = new Map<string, { count: number; duration: number }>();
  teachers.forEach(teacher => {
    const historical = historicalStats[teacher.name] || { count: 0, duration: 0 };
    teacherWorkload.set(teacher.name, { ...historical });
  });

  const assignments: Assignment[] = [];

  // Step 1: Handle pre-assigned tasks (designated and forced)
  const preAssignedTasks = [
    ...specialTasks.designated.map(task => ({
      type: 'designated' as const,
      ...task
    })),
    ...specialTasks.forced.map(task => ({
      type: 'forced' as const,
      ...task
    }))
  ];

  for (const task of preAssignedTasks) {
    const schedule = schedules.find(s => 
      s.id.startsWith(task.slotId || task.sessionId) && 
      s.location === task.location
    );
    
    if (schedule) {
      const hasConflict = assignments.some(a => 
        a.teacher === task.teacher && 
        a.date === schedule.date &&
        !(a.endTime <= schedule.startTime || a.startTime >= schedule.endTime)
      );

      const assignment: Assignment = {
        ...schedule,
        teacher: hasConflict ? `!!${task.type === 'forced' ? '锁定' : '指定'}冲突: ${task.teacher}!!` : task.teacher,
        assignedBy: task.type === 'forced' ? 'forced' : 'designated'
      };

      assignments.push(assignment);

      if (!hasConflict) {
        updateTeacherWorkload(teacherWorkload, task.teacher, schedule);
      }
    }
  }

  // Step 2: Get remaining slots to fill
  const remainingSlots = getRemainingSlots(schedules, assignments);

  // Step 3: Sort slots by priority (date, time, location)
  remainingSlots.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.startTime}`);
    const dateB = new Date(`${b.date} ${b.startTime}`);
    return dateA.getTime() - dateB.getTime() || a.location.localeCompare(b.location);
  });

  // Step 4: Assign teachers to remaining slots using intelligent algorithm
  for (const slot of remainingSlots) {
    const assignedTeachersInSlot = assignments
      .filter(a => a.id === slot.id)
      .map(a => a.teacher.replace(/!!.*: (.*)!!/, '$1'));

    // Get eligible teachers for this slot
    const eligibleTeachers = getEligibleTeachers(
      teachers,
      slot,
      assignments,
      teacherExclusions,
      assignedTeachersInSlot
    );

    if (eligibleTeachers.length > 0) {
      // Sort by workload (least loaded first)
      const sortedTeachers = eligibleTeachers.sort((a, b) => {
        const workloadA = teacherWorkload.get(a.name) || { count: 0, duration: 0 };
        const workloadB = teacherWorkload.get(b.name) || { count: 0, duration: 0 };
        
        if (workloadA.count !== workloadB.count) {
          return workloadA.count - workloadB.count;
        }
        return workloadA.duration - workloadB.duration;
      });

      const chosenTeacher = sortedTeachers[0];
      const assignment: Assignment = {
        ...slot,
        teacher: chosenTeacher.name,
        assignedBy: 'auto'
      };

      assignments.push(assignment);
      updateTeacherWorkload(teacherWorkload, chosenTeacher.name, slot);
    } else {
      // No eligible teacher found
      const assignment: Assignment = {
        ...slot,
        teacher: '!!无法分配!!',
        assignedBy: 'auto'
      };
      assignments.push(assignment);
    }
  }

  // Sort final assignments by date and time
  return assignments.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.startTime}`);
    const dateB = new Date(`${b.date} ${b.startTime}`);
    return dateA.getTime() - dateB.getTime() || a.location.localeCompare(b.location);
  });
};

function updateTeacherWorkload(
  workload: Map<string, { count: number; duration: number }>,
  teacher: string,
  schedule: Schedule
) {
  const current = workload.get(teacher) || { count: 0, duration: 0 };
  const duration = calculateDuration(schedule.startTime, schedule.endTime);
  
  workload.set(teacher, {
    count: current.count + 1,
    duration: current.duration + duration
  });
}

function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(`1970-01-01T${startTime}:00`);
  const end = new Date(`1970-01-01T${endTime}:00`);
  return (end.getTime() - start.getTime()) / 60000; // duration in minutes
}

function getRemainingSlots(schedules: Schedule[], assignments: Assignment[]): Schedule[] {
  const remainingSlots: Schedule[] = [];

  for (const schedule of schedules) {
    const assignedCount = assignments.filter(a => 
      a.id === schedule.id && !a.teacher.startsWith('!!')
    ).length;
    
    const remaining = schedule.required - assignedCount;
    
    for (let i = 0; i < remaining; i++) {
      remainingSlots.push({
        ...schedule,
        id: `${schedule.id}_auto_${i}`
      });
    }
  }

  return remainingSlots;
}

function getEligibleTeachers(
  teachers: Teacher[],
  slot: Schedule,
  assignments: Assignment[],
  teacherExclusions: Map<string, Set<string>>,
  assignedTeachersInSlot: string[]
): Teacher[] {
  return teachers.filter(teacher => {
    // Skip if already assigned to this slot
    if (assignedTeachersInSlot.includes(teacher.name)) {
      return false;
    }

    // Check for time conflicts
    const hasConflict = assignments.some(a => 
      a.teacher === teacher.name &&
      a.date === slot.date &&
      !(a.endTime <= slot.startTime || a.startTime >= slot.endTime)
    );
    if (hasConflict) return false;

    // Check exclusions
    const exclusions = teacherExclusions.get(teacher.name);
    if (exclusions) {
      const sessionId = `${slot.date}_${slot.startTime}_${slot.endTime}`;
      if (exclusions.has(`${sessionId}_all`) || exclusions.has(`${sessionId}_${slot.location}`)) {
        return false;
      }
    }

    // Check if teacher has already been assigned to this location
    const hasLocationConflict = assignments.some(a => 
      a.teacher === teacher.name && a.location === slot.location
    );
    if (hasLocationConflict) return false;

    return true;
  });
}