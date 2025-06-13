import React, { useMemo } from 'react';
import { BarChart3, Download, Printer, Trophy, TrendingUp, Users, Clock } from 'lucide-react';
import { Assignment, Teacher, HistoricalStats, TeacherStats } from '../types';

interface StatisticsPanelProps {
  assignments: Assignment[];
  teachers: Teacher[];
  historicalStats: HistoricalStats;
  onExportHistory: () => void;
  onImportHistory: () => void;
  onClearHistory: () => void;
  onPrintSlip: (teacherName: string) => void;
  className?: string;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  assignments,
  teachers,
  historicalStats,
  onExportHistory,
  onImportHistory,
  onClearHistory,
  onPrintSlip,
  className = ''
}) => {
  const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    return (end.getTime() - start.getTime()) / 60000;
  };

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '0分钟';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return (hours > 0 ? `${hours}小时 ` : '') + (mins > 0 ? `${mins}分钟` : '').trim();
  };

  const stats = useMemo(() => {
    return teachers.map(teacher => {
      const name = teacher.name;
      const currentAssignments = assignments.filter(a => a.teacher === name);
      
      const current = currentAssignments.reduce((acc, a) => {
        acc.count++;
        const duration = calculateDuration(a.startTime, a.endTime);
        acc.duration += duration;
        return acc;
      }, { count: 0, duration: 0 });

      const historical = historicalStats[name] || { count: 0, duration: 0 };
      const total = {
        count: current.count + historical.count,
        duration: current.duration + historical.duration
      };

      return {
        name,
        current,
        total,
        department: teacher.department
      } as TeacherStats;
    }).sort((a, b) => b.total.duration - a.total.duration);
  }, [assignments, teachers, historicalStats]);

  // 计算工作量均衡度
  const workloadBalance = useMemo(() => {
    if (stats.length === 0) return { average: 0, variance: 0, maxDeviation: 0 };
    
    const durations = stats.map(s => s.current.duration);
    const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) / durations.length;
    const maxDeviation = Math.max(...durations.map(d => Math.abs(d - average)));
    
    return { average, variance, maxDeviation };
  }, [stats]);

  const getStatsBadge = (index: number, total: number, stat: any) => {
    const isOverloaded = stat.current.duration > workloadBalance.average * 1.3;
    const isUnderloaded = stat.current.duration < workloadBalance.average * 0.7 && workloadBalance.average > 0;
    
    if (isOverloaded) return { bg: 'bg-orange-50', border: 'border-orange-200', icon: '⚡', label: '工作量较重' };
    if (isUnderloaded) return { bg: 'bg-green-50', border: 'border-green-200', icon: '🌱', label: '工作量较轻' };
    if (index === 0) return { bg: 'bg-red-50', border: 'border-red-200', icon: '🥇', label: '最多' };
    if (index === 1) return { bg: 'bg-orange-50', border: 'border-orange-200', icon: '🥈', label: '第二' };
    if (index === 2) return { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '🥉', label: '第三' };
    return { bg: 'bg-white', border: 'border-gray-200', icon: '👤', label: '正常' };
  };

  if (stats.length === 0 || assignments.length === 0) {
    return (
      <div className={`flex flex-col ${className}`}>
        {/* History Management */}
        <div className="p-4 border border-dashed rounded-lg mb-4 bg-gray-50">
          <h4 className="font-semibold text-sm text-center mb-3 text-gray-600 flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            历史数据管理
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <button
              onClick={onImportHistory}
              className="bg-sky-100 text-sky-700 font-medium py-2 rounded-md hover:bg-sky-200 transition-colors"
            >
              导入历史数据
            </button>
            <button
              onClick={onExportHistory}
              className="bg-emerald-100 text-emerald-700 font-medium py-2 rounded-md hover:bg-emerald-200 transition-colors"
            >
              导出累计数据
            </button>
            <button
              onClick={onClearHistory}
              className="bg-rose-100 text-rose-700 font-medium py-2 rounded-md hover:bg-rose-200 transition-colors"
            >
              清空历史数据
            </button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center text-center py-20 flex-1">
          <BarChart3 className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">暂无统计数据</h3>
          <p className="text-gray-400 text-sm">生成分配后将在此显示详细统计</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 工作量均衡度概览 */}
      <div className="p-3 border rounded-lg mb-4 bg-gradient-to-r from-blue-50 to-purple-50">
        <h4 className="font-semibold text-sm mb-2 text-gray-700 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          工作量均衡度
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/70 p-2 rounded">
            <div className="text-gray-600">平均工作量</div>
            <div className="font-bold text-blue-600">{formatDuration(workloadBalance.average)}</div>
          </div>
          <div className="bg-white/70 p-2 rounded">
            <div className="text-gray-600">最大偏差</div>
            <div className="font-bold text-purple-600">{formatDuration(workloadBalance.maxDeviation)}</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          💡 一个时间段只能监考一个考场，通过长期统计实现工作量均衡
        </div>
      </div>

      {/* History Management */}
      <div className="p-4 border border-dashed rounded-lg mb-4 bg-gray-50">
        <h4 className="font-semibold text-sm text-center mb-3 text-gray-600 flex items-center justify-center gap-2">
          <Download className="w-4 h-4" />
          历史数据管理
        </h4>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <button
            onClick={onImportHistory}
            className="bg-sky-100 text-sky-700 font-medium py-2 rounded-md hover:bg-sky-200 transition-colors"
          >
            导入历史数据
          </button>
          <button
            onClick={onExportHistory}
            className="bg-emerald-100 text-emerald-700 font-medium py-2 rounded-md hover:bg-emerald-200 transition-colors"
          >
            导出累计数据
          </button>
          <button
            onClick={onClearHistory}
            className="bg-rose-100 text-rose-700 font-medium py-2 rounded-md hover:bg-rose-200 transition-colors"
          >
            清空历史数据
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {stats.map((stat, index) => {
          const badge = getStatsBadge(index, stats.length, stat);
          
          return (
            <div
              key={stat.name}
              className={`${badge.bg} ${badge.border} p-3 rounded-lg border text-xs transition-all hover:shadow-sm`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base" title={badge.label}>{badge.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{stat.name}</p>
                    {stat.department && (
                      <p className="text-xs text-gray-500">{stat.department}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onPrintSlip(stat.name)}
                  className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded-md hover:bg-white/50"
                  title="生成通知单"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2 text-gray-600">
                <div className="bg-blue-100/50 px-2 py-1 rounded flex justify-between">
                  <span><strong>本次:</strong></span>
                  <span>{stat.current.count} 次</span>
                </div>
                <div className="bg-blue-100/50 px-2 py-1 rounded flex justify-between">
                  <span><strong>时长:</strong></span>
                  <span>{formatDuration(stat.current.duration)}</span>
                </div>
                <div className="font-bold bg-emerald-100/50 px-2 py-1 rounded flex justify-between">
                  <span><strong>累计:</strong></span>
                  <span>{stat.total.count} 次, {formatDuration(stat.total.duration)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatisticsPanel;