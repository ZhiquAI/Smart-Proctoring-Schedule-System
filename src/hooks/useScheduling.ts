import { useState, useCallback } from 'react';
import { Teacher, Schedule, Assignment, SpecialTask, HistoricalStats, Session, ValidationIssue, Conflict } from '../types';
import { validateSchedulingData } from '../utils/validation';
import { detectConflicts } from '../utils/conflictDetection';
import { useSchedulingWorker } from './useSchedulingWorker';

export const useScheduling = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [specialTasks, setSpecialTasks] = useState<SpecialTask>({
    designated: [],
    forced: []
  });
  const [teacherExclusions, setTeacherExclusions] = useState<Map<string, Set<string>>>(new Map());
  const [historicalStats, setHistoricalStats] = useState<HistoricalStats>({});
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  const { generateAssignments: workerGenerateAssignments, isLoading, progress } = useSchedulingWorker();

  const generateAssignments = useCallback(async () => {
    try {
      // Validate data first
      const issues = validateSchedulingData(teachers, schedules, specialTasks, teacherExclusions);
      setValidationIssues(issues);

      if (issues.some(issue => issue.type === 'error')) {
        throw new Error('存在阻止生成的错误，请先修复');
      }

      // Generate assignments using worker
      const newAssignments = await workerGenerateAssignments({
        teachers,
        schedules,
        sessions,
        specialTasks,
        teacherExclusions,
        historicalStats
      });

      setAssignments(newAssignments);
      return newAssignments;
    } catch (error) {
      console.error('生成排班失败:', error);
      throw error;
    }
  }, [teachers, schedules, sessions, specialTasks, teacherExclusions, historicalStats, workerGenerateAssignments]);

  const updateAssignment = useCallback((assignmentId: string, newTeacher: string) => {
    setAssignments(prev => prev.map(assignment => 
      assignment.id === assignmentId 
        ? { ...assignment, teacher: newTeacher, assignedBy: 'manual' as const }
        : assignment
    ));
  }, []);

  const swapAssignments = useCallback((id1: string, id2: string) => {
    setAssignments(prev => {
      const newAssignments = [...prev];
      
      // Extract indices from the IDs
      const getIndexFromId = (id: string) => {
        const parts = id.split('_');
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart);
      };

      const index1 = getIndexFromId(id1);
      const index2 = getIndexFromId(id2);
      
      if (index1 >= 0 && index2 >= 0 && index1 < newAssignments.length && index2 < newAssignments.length) {
        // Swap the teachers
        const temp = newAssignments[index1].teacher;
        newAssignments[index1] = { 
          ...newAssignments[index1], 
          teacher: newAssignments[index2].teacher,
          assignedBy: 'manual' as const
        };
        newAssignments[index2] = { 
          ...newAssignments[index2], 
          teacher: temp,
          assignedBy: 'manual' as const
        };
      }
      
      return newAssignments;
    });
  }, []);

  const getConflicts = useCallback((): Conflict[] => {
    return detectConflicts(assignments, teachers, teacherExclusions);
  }, [assignments, teachers, teacherExclusions]);

  const addTeacherExclusion = useCallback((teacher: string, sessionId: string, location?: string) => {
    setTeacherExclusions(prev => {
      const newMap = new Map(prev);
      const key = location ? `${sessionId}_${location}` : `${sessionId}_all`;
      
      if (!newMap.has(teacher)) {
        newMap.set(teacher, new Set());
      }
      
      newMap.get(teacher)!.add(key);
      return newMap;
    });
  }, []);

  const removeTeacherExclusion = useCallback((teacher: string, sessionId: string, location?: string) => {
    setTeacherExclusions(prev => {
      const newMap = new Map(prev);
      const key = location ? `${sessionId}_${location}` : `${sessionId}_all`;
      
      if (newMap.has(teacher)) {
        newMap.get(teacher)!.delete(key);
        if (newMap.get(teacher)!.size === 0) {
          newMap.delete(teacher);
        }
      }
      
      return newMap;
    });
  }, []);

  const resetAllData = useCallback(() => {
    setTeachers([]);
    setSchedules([]);
    setSessions([]);
    setAssignments([]);
    setSpecialTasks({ designated: [], forced: [] });
    setTeacherExclusions(new Map());
    setValidationIssues([]);
  }, []);

  return {
    // State
    teachers,
    schedules,
    sessions,
    assignments,
    specialTasks,
    teacherExclusions,
    historicalStats,
    isLoading,
    progress,
    validationIssues,
    
    // Setters
    setTeachers,
    setSchedules,
    setSessions,
    setSpecialTasks,
    setHistoricalStats,
    
    // Actions
    generateAssignments,
    updateAssignment,
    swapAssignments,
    getConflicts,
    addTeacherExclusion,
    removeTeacherExclusion,
    resetAllData
  };
};