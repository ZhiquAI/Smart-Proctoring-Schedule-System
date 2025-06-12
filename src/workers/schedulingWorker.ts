import { Teacher, Schedule, Session, Assignment, SpecialTask, HistoricalStats } from '../types';

interface SchedulingParams {
  teachers: Teacher[];
  schedules: Schedule[];
  sessions: Session[];
  specialTasks: SpecialTask;
  teacherExclusions: Map<string, Set<string>>;
  historicalStats: HistoricalStats;
}

interface WorkerMessage {
  type: 'GENERATE_ASSIGNMENTS';
  payload: {
    teachers: Teacher[];
    schedules: Schedule[];
    sessions: Session[];
    specialTasks: SpecialTask;
    teacherExclusions: [string, string[]][];
    historicalStats: HistoricalStats;
  };
}

interface WorkerResponse {
  type: 'ASSIGNMENTS_GENERATED' | 'ERROR' | 'PROGRESS';
  payload: Assignment[] | string | { progress: number; message: string };
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  if (type === 'GENERATE_ASSIGNMENTS') {
    try {
      // Convert teacherExclusions back to Map
      const teacherExclusions = new Map(
        payload.teacherExclusions.map(([key, values]) => [key, new Set(values)])
      );

      const params: SchedulingParams = {
        ...payload,
        teacherExclusions
      };

      const assignments = await generateOptimalAssignments(params);
      
      self.postMessage({
        type: 'ASSIGNMENTS_GENERATED',
        payload: assignments
      } as WorkerResponse);
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        payload: error instanceof Error ? error.message : 'Unknown error occurred'
      } as WorkerResponse);
    }
  }
};

const generateOptimalAssignments = async (params: SchedulingParams): Promise<Assignment[]> => {
  const { teachers, schedules, specialTasks, teacherExclusions, historicalStats } = params;
  
  // Send progress update
  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 10, message: '初始化教师工作量统计...' }
  } as WorkerResponse);

  // Initialize teacher workload tracking
  const teacherWorkload = new Map<string, { count: number; duration: number }>();
  teachers.forEach(teacher => {
    const historical = historicalStats[teacher.name] || { count: 0, duration: 0 };
    teacherWorkload.set(teacher.name, { ...historical });
  });

  const assignments: Assignment[] = [];

  // Send progress update
  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 20, message: '处理预分配任务...' }
  } as WorkerResponse);

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

  // Send progress update
  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 40, message: '计算剩余排班需求...' }
  } as WorkerResponse);

  // Step 2: Get remaining slots to fill
  const remainingSlots = getRemainingSlots(schedules, assignments);

  // Step 3: Sort slots by priority (date, time, location)
  remainingSlots.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.startTime}`);
    const dateB = new Date(`${b.date} ${b.startTime}`);
    return dateA.getTime() - dateB.getTime() || a.location.localeCompare(b.location);
  });

  // Send progress update
  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 60, message: '智能分配教师...' }
  } as WorkerResponse);

  // Step 4: Assign teachers to remaining slots using intelligent algorithm
  const totalSlots = remainingSlots.length;
  for (let i = 0; i < remainingSlots.length; i++) {
    const slot = remainingSlots[i];
    
    // Update progress periodically
    if (i % Math.max(1, Math.floor(totalSlots / 10)) === 0) {
      const progress = 60 + Math.floor((i / totalSlots) * 30);
      self.postMessage({
        type: 'PROGRESS',
        payload: { progress, message: `分配进度: ${i + 1}/${totalSlots}` }
      } as WorkerResponse);
    }

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

  // Send final progress update
  self.postMessage({
    type: 'PROGRESS',
    payload: { progress: 95, message: '整理排班结果...' }
  } as WorkerResponse);

  // Sort final assignments by date and time
  const sortedAssignments = assignments.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.startTime}`);
    const dateB = new Date(`${b.date} ${b.startTime}`);
    return dateA.getTime() - dateB.getTime() || a.location.localeCompare(b.location);
  });

  // Small delay to show completion
  await new Promise(resolve => setTimeout(resolve, 200));

  return sortedAssignments;
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