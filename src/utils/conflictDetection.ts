import { Assignment, Teacher, Conflict } from '../types';

export const detectConflicts = (
  assignments: Assignment[],
  teachers: Teacher[],
  teacherExclusions: Map<string, Set<string>>
): Conflict[] => {
  const conflicts: Conflict[] = [];

  // 计算教师工作量统计
  const teacherStats = calculateTeacherWorkload(assignments, teachers);
  const avgWorkload = calculateAverageWorkload(teacherStats);
  const workloadThreshold = avgWorkload * 1.5; // 允许超出平均工作量50%

  // 检测分配错误（人员不足等系统错误）
  assignments.forEach(assignment => {
    if (assignment.teacher.startsWith('!!')) {
      conflicts.push({
        type: 'allocation',
        description: `${assignment.teacher} (考场: ${assignment.location}, 时间: ${assignment.date} ${assignment.startTime})`,
        severity: 'high'
      });
    }
  });

  // 按教师分组分析
  const teacherSchedules = new Map<string, Assignment[]>();
  assignments.forEach(assignment => {
    if (!assignment.teacher.startsWith('!!')) {
      if (!teacherSchedules.has(assignment.teacher)) {
        teacherSchedules.set(assignment.teacher, []);
      }
      teacherSchedules.get(assignment.teacher)!.push(assignment);
    }
  });

  // 检测时间冲突
  teacherSchedules.forEach((schedule, teacher) => {
    schedule.sort((a, b) => new Date(`${a.date} ${a.startTime}`).getTime() - new Date(`${b.date} ${b.startTime}`).getTime());
    
    for (let i = 0; i < schedule.length - 1; i++) {
      const current = schedule[i];
      const next = schedule[i + 1];
      
      // 检查同一时间段是否被分配到多个考场
      if (current.date === next.date && 
          current.startTime === next.startTime &&
          current.endTime === next.endTime &&
          current.location !== next.location) {
        conflicts.push({
          type: 'time',
          description: `${teacher} 在 ${current.date} ${current.startTime}-${current.endTime} 被分配到多个考场: ${current.location} 和 ${next.location}`,
          severity: 'high'
        });
      }
      
      // 检查时间重叠冲突
      if (current.date === next.date) {
        const currentEnd = new Date(`${current.date} ${current.endTime}`);
        const nextStart = new Date(`${next.date} ${next.startTime}`);
        
        if (currentEnd > nextStart) {
          conflicts.push({
            type: 'time',
            description: `${teacher} 在 ${current.date} 有时间重叠: ${current.startTime}-${current.endTime} (考场 ${current.location}) 和 ${next.startTime}-${next.endTime} (考场 ${next.location})`,
            severity: 'high'
          });
        }
      }
    }

    // 工作量均衡性检查（仅作为低优先级提示）
    const teacherWorkload = teacherStats.get(teacher);
    if (teacherWorkload && teacherWorkload.totalDuration > workloadThreshold && avgWorkload > 0) {
      const overloadPercentage = Math.round(((teacherWorkload.totalDuration - avgWorkload) / avgWorkload) * 100);
      
      conflicts.push({
        type: 'allocation',
        description: `${teacher} 工作量较重 (超出平均值 ${overloadPercentage}%)，建议在后续排班中适当减少安排`,
        severity: 'low'
      });
    }

    // 检查规则违反（排除时间）
    const exclusions = teacherExclusions.get(teacher);
    if (exclusions) {
      schedule.forEach(assignment => {
        const sessionId = `${assignment.date}_${assignment.startTime}_${assignment.endTime}`;
        if (exclusions.has(`${sessionId}_all`) || exclusions.has(`${sessionId}_${assignment.location}`)) {
          conflicts.push({
            type: 'rule',
            description: `${teacher} 被安排在已排除的时间段: ${assignment.date} ${assignment.startTime}-${assignment.endTime} (考场 ${assignment.location})`,
            severity: 'high'
          });
        }
      });
    }
  });

  // 检查是否有未分配的场次
  const unassignedSlots = findUnassignedSlots(assignments);
  if (unassignedSlots.length > 0) {
    conflicts.push({
      type: 'allocation',
      description: `发现 ${unassignedSlots.length} 个未完全分配的场次，建议检查教师人数是否充足`,
      severity: 'medium'
    });
  }

  return conflicts;
};

// 计算教师工作量统计
function calculateTeacherWorkload(assignments: Assignment[], teachers: Teacher[]) {
  const stats = new Map<string, {
    assignmentCount: number;
    totalDuration: number;
  }>();

  // 初始化所有教师的统计
  teachers.forEach(teacher => {
    stats.set(teacher.name, {
      assignmentCount: 0,
      totalDuration: 0
    });
  });

  // 统计实际分配
  assignments.forEach(assignment => {
    if (!assignment.teacher.startsWith('!!')) {
      const teacherStat = stats.get(assignment.teacher);
      if (teacherStat) {
        teacherStat.assignmentCount++;
        
        // 计算时长（分钟）
        const duration = calculateDuration(assignment.startTime, assignment.endTime);
        teacherStat.totalDuration += duration;
      }
    }
  });

  return stats;
}

// 计算平均工作量
function calculateAverageWorkload(teacherStats: Map<string, any>): number {
  const workloads = Array.from(teacherStats.values()).map(stat => stat.totalDuration);
  const totalWorkload = workloads.reduce((sum, workload) => sum + workload, 0);
  return workloads.length > 0 ? totalWorkload / workloads.length : 0;
}

// 查找未分配的场次
function findUnassignedSlots(assignments: Assignment[]): string[] {
  // 这里可以根据原始的场次需求来检查是否有遗漏
  // 暂时返回空数组，实际实现需要与原始需求对比
  return [];
}

// 计算时间段长度（分钟）
function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(`1970-01-01T${startTime}:00`);
  const end = new Date(`1970-01-01T${endTime}:00`);
  return (end.getTime() - start.getTime()) / 60000;
}