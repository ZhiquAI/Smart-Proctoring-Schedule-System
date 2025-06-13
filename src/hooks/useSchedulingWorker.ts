import { useCallback, useRef, useState } from 'react';
import { Teacher, Schedule, Session, Assignment, SpecialTask, HistoricalStats } from '../types';

interface WorkerProgress {
  progress: number;
  message: string;
}

export const useSchedulingWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<WorkerProgress>({ progress: 0, message: '' });

  const initializeWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/schedulingWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  const generateAssignments = useCallback(async (params: {
    teachers: Teacher[];
    schedules: Schedule[];
    sessions: Session[];
    specialTasks: SpecialTask;
    teacherExclusions: Map<string, Set<string>>;
    historicalStats: HistoricalStats;
  }): Promise<Assignment[]> => {
    return new Promise((resolve, reject) => {
      const worker = initializeWorker();
      
      setIsLoading(true);
      setProgress({ progress: 0, message: '准备开始...' });

      // Convert Map to serializable format
      const teacherExclusionsArray: [string, string[]][] = Array.from(
        params.teacherExclusions.entries()
      ).map(([key, set]) => [key, Array.from(set)]);

      worker.onmessage = (event) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'PROGRESS':
            setProgress(payload);
            break;
          
          case 'ASSIGNMENTS_GENERATED':
            setIsLoading(false);
            setProgress({ progress: 100, message: '完成!' });
            resolve(payload);
            break;
          
          case 'ERROR':
            setIsLoading(false);
            setProgress({ progress: 0, message: '' });
            reject(new Error(payload));
            break;
        }
      };

      worker.onerror = (error) => {
        setIsLoading(false);
        setProgress({ progress: 0, message: '' });
        const errorMessage = error.message || error.error?.message || 'Web Worker encountered an unknown error';
        reject(new Error('Worker error: ' + errorMessage));
      };

      worker.postMessage({
        type: 'GENERATE_ASSIGNMENTS',
        payload: {
          ...params,
          teacherExclusions: teacherExclusionsArray
        }
      });
    });
  }, [initializeWorker]);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsLoading(false);
    setProgress({ progress: 0, message: '' });
  }, []);

  return {
    generateAssignments,
    terminateWorker,
    isLoading,
    progress
  };
};