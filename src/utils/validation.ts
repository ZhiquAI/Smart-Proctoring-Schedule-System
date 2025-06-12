import { Teacher, Schedule, SpecialTask, ValidationIssue } from '../types';

export const validateSchedulingData = (
  teachers: Teacher[],
  schedules: Schedule[],
  specialTasks: SpecialTask,
  teacherExclusions: Map<string, Set<string>>
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  // Validate teachers
  if (teachers.length === 0) {
    issues.push({
      type: 'error',
      message: '请先导入教师名单',
      field: 'teachers'
    });
  } else {
    const duplicateNames = findDuplicateNames(teachers);
    if (duplicateNames.length > 0) {
      issues.push({
        type: 'warning',
        message: `教师名单中存在重复姓名: ${duplicateNames.join(', ')}`,
        field: 'teachers'
      });
    }
  }

  // Validate schedules
  if (schedules.length === 0) {
    issues.push({
      type: 'error',
      message: '请先导入考场安排',
      field: 'schedules'
    });
  } else {
    schedules.forEach((schedule, index) => {
      if (!schedule.date || !schedule.startTime || !schedule.endTime || !schedule.location) {
        issues.push({
          type: 'error',
          message: `考场安排第 ${index + 1} 行数据不完整`,
          field: 'schedules'
        });
      }
    });
  }

  // Validate special tasks
  const teacherNames = new Set(teachers.map(t => t.name));
  
  specialTasks.designated.forEach((task, index) => {
    if (!teacherNames.has(task.teacher)) {
      issues.push({
        type: 'warning',
        message: `指定监考任务 ${index + 1} 中的教师 "${task.teacher}" 不在教师名单中`,
        field: 'designated'
      });
    }
  });

  specialTasks.forced.forEach((task, index) => {
    if (!teacherNames.has(task.teacher)) {
      issues.push({
        type: 'warning',
        message: `锁定安排 ${index + 1} 中的教师 "${task.teacher}" 不在教师名单中`,
        field: 'forced'
      });
    }
  });

  return issues;
};

function findDuplicateNames(teachers: Teacher[]): string[] {
  const nameCount = new Map<string, number>();
  
  teachers.forEach(teacher => {
    nameCount.set(teacher.name, (nameCount.get(teacher.name) || 0) + 1);
  });

  return Array.from(nameCount.entries())
    .filter(([_, count]) => count > 1)
    .map(([name]) => name);
}