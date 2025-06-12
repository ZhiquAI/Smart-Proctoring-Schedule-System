import React, { useState, useCallback } from 'react';
import { Calendar, Download, AlertTriangle, CheckCircle, Wand2, FileText, Printer } from 'lucide-react';
import { useScheduling } from './hooks/useScheduling';
import { processTeacherFile, processScheduleFile } from './utils/fileProcessing';
import { exportToExcel, exportHistoricalStats } from './utils/export';
import FileUpload from './components/FileUpload';
import ScheduleTable from './components/ScheduleTable';
import StatisticsPanel from './components/StatisticsPanel';
import RulesPanel from './components/RulesPanel';
import Modal from './components/ui/Modal';
import Alert from './components/ui/Alert';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { Teacher, Schedule, HistoricalStats, Session, Slot } from './types';

function App() {
  const {
    teachers,
    schedules,
    sessions,
    assignments,
    specialTasks,
    teacherExclusions,
    historicalStats,
    isLoading,
    validationIssues,
    setTeachers,
    setSchedules,
    setSessions,
    setSpecialTasks,
    setHistoricalStats,
    generateAssignments,
    swapAssignments,
    getConflicts,
    addTeacherExclusion,
    removeTeacherExclusion
  } = useScheduling();

  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printTeacher, setPrintTeacher] = useState<string>('');

  const showAlert = useCallback((type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setAlertMessage({ type, title, message });
  }, []);

  const groupScheduleIntoSessions = useCallback((scheduleData: Schedule[]) => {
    const sessionMap = new Map<string, Session>();
    
    scheduleData.forEach(slot => {
      const sessionId = `${slot.date}_${slot.startTime}_${slot.endTime}`;
      
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          id: sessionId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          slots: []
        });
      }
      
      sessionMap.get(sessionId)!.slots.push({
        location: slot.location,
        required: slot.required
      });
    });

    const sessionsArray = Array.from(sessionMap.values()).sort((a, b) => 
      new Date(`${a.date} ${a.startTime}`).getTime() - new Date(`${b.date} ${b.startTime}`).getTime()
    );

    setSessions(sessionsArray);
    return sessionsArray;
  }, [setSessions]);

  const handleTeacherData = useCallback((data: Teacher[]) => {
    setTeachers(data);
  }, [setTeachers]);

  const handleScheduleData = useCallback((data: Schedule[]) => {
    setSchedules(data);
    groupScheduleIntoSessions(data);
  }, [setSchedules, groupScheduleIntoSessions]);

  const handleGenerateAssignments = useCallback(async () => {
    try {
      await generateAssignments();
      showAlert('success', '成功', '排班分配已完成！');
    } catch (error) {
      showAlert('error', '错误', error instanceof Error ? error.message : '生成排班时发生错误');
    }
  }, [generateAssignments, showAlert]);

  const handleExportExcel = useCallback(() => {
    try {
      exportToExcel(assignments, `排班结果_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showAlert('success', '成功', '排班结果已导出');
    } catch (error) {
      showAlert('error', '错误', error instanceof Error ? error.message : '导出失败');
    }
  }, [assignments, showAlert]);

  const handleImportHistory = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string);
          if (typeof importedData === 'object' && !Array.isArray(importedData)) {
            setHistoricalStats(importedData);
            showAlert('success', '成功', '历史数据已成功导入');
          } else {
            throw new Error('格式不正确');
          }
        } catch (err) {
          showAlert('error', '错误', '无法解析文件或文件格式不正确');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setHistoricalStats, showAlert]);

  const handleExportHistory = useCallback(() => {
    try {
      const dataToExport = { ...historicalStats };

      // Add current assignments to historical stats
      teachers.forEach(teacher => {
        const current = assignments
          .filter(a => a.teacher === teacher.name && !a.teacher.startsWith('!!'))
          .reduce((acc, a) => {
            acc.count++;
            const duration = (new Date(`1970-01-01T${a.endTime}:00`).getTime() - 
                             new Date(`1970-01-01T${a.startTime}:00`).getTime()) / 60000;
            acc.duration += duration;
            return acc;
          }, { count: 0, duration: 0 });

        if (!dataToExport[teacher.name]) {
          dataToExport[teacher.name] = { count: 0, duration: 0 };
        }

        dataToExport[teacher.name].count += current.count;
        dataToExport[teacher.name].duration += current.duration;
      });

      exportHistoricalStats(dataToExport, `监考工作量累计_${new Date().toISOString().slice(0, 10)}.json`);
      showAlert('success', '成功', '累计数据已导出');
    } catch (error) {
      showAlert('error', '错误', '导出失败');
    }
  }, [historicalStats, teachers, assignments, showAlert]);

  const handleClearHistory = useCallback(() => {
    setHistoricalStats({});
    showAlert('success', '成功', '历史数据已清空');
  }, [setHistoricalStats, showAlert]);

  const handleShowConflicts = useCallback(() => {
    setShowConflictModal(true);
  }, []);

  const handlePrintSlip = useCallback((teacherName: string) => {
    setPrintTeacher(teacherName);
    setShowPrintModal(true);
  }, []);

  const conflicts = getConflicts();
  const canGenerate = teachers.length > 0 && schedules.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">智能监考排班系统</h1>
            <span className="text-xs font-semibold bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
              V2.0
            </span>
          </div>
          <p className="text-gray-600">基于智能算法的自动化排班解决方案</p>
        </header>

        {/* Alert Messages */}
        {alertMessage && (
          <div className="mb-6">
            <Alert
              type={alertMessage.type}
              title={alertMessage.title}
              message={alertMessage.message}
              onClose={() => setAlertMessage(null)}
            />
          </div>
        )}

        {/* Validation Issues */}
        {validationIssues.length > 0 && (
          <div className="mb-6">
            <Alert
              type="warning"
              title="数据校验警告"
              message={validationIssues.map(issue => issue.message).join('\n')}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Settings */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/40 shadow-lg">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  排班设置
                </h2>
              </div>
              
              <div className="p-4 space-y-6">
                {/* Step 1: File Upload */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <h3 className="font-semibold text-gray-700">数据导入</h3>
                  </div>
                  <div className="space-y-3">
                    <FileUpload type="teacher" onDataLoaded={handleTeacherData} />
                    <FileUpload type="schedule" onDataLoaded={handleScheduleData} />
                  </div>
                </div>

                {/* Step 2: Rules Configuration */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <h3 className="font-semibold text-gray-700">规则配置</h3>
                  </div>
                  <RulesPanel
                    teachers={teachers}
                    sessions={sessions}
                    specialTasks={specialTasks}
                    teacherExclusions={teacherExclusions}
                    onUpdateSpecialTasks={setSpecialTasks}
                    onAddExclusion={addTeacherExclusion}
                    onRemoveExclusion={removeTeacherExclusion}
                  />
                </div>

                {/* Step 3: Generate */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <h3 className="font-semibold text-gray-700">智能分配</h3>
                  </div>
                  <button
                    onClick={handleGenerateAssignments}
                    disabled={!canGenerate || isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm\" className="text-white" />
                        <span>分配中...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        <span>开始分配</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Center Panel - Schedule Preview */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/40 shadow-lg h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  排班预览
                </h2>
                
                {assignments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShowConflicts}
                      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                        conflicts.length === 0
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {conflicts.length === 0 ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          无冲突
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4" />
                          {conflicts.length} 条冲突
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleExportExcel}
                      className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      导出
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-hidden p-4">
                <ScheduleTable
                  assignments={assignments}
                  onSwapAssignments={swapAssignments}
                  className="h-full"
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Statistics */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/40 shadow-lg h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Printer className="w-5 h-5" />
                  数据统计
                </h2>
              </div>
              
              <div className="flex-1 overflow-hidden p-4">
                <StatisticsPanel
                  assignments={assignments}
                  teachers={teachers}
                  historicalStats={historicalStats}
                  onExportHistory={handleExportHistory}
                  onImportHistory={handleImportHistory}
                  onClearHistory={handleClearHistory}
                  onPrintSlip={handlePrintSlip}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Modal */}
      <Modal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        title={conflicts.length === 0 ? '冲突检测结果' : `发现 ${conflicts.length} 条冲突`}
        size="lg"
      >
        <div className="p-6">
          {conflicts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">太棒了！</h3>
              <p className="text-gray-600">系统未检测到任何排班冲突</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    conflict.severity === 'high'
                      ? 'bg-red-50 border-red-200'
                      : conflict.severity === 'medium'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                      conflict.severity === 'high'
                        ? 'text-red-500'
                        : conflict.severity === 'medium'
                        ? 'text-yellow-500'
                        : 'text-blue-500'
                    }`} />
                    <div>
                      <h4 className="font-medium text-sm">{conflict.type}</h4>
                      <p className="text-sm text-gray-600 mt-1">{conflict.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Print Modal */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="监考通知单"
        size="md"
      >
        <div className="p-6">
          {printTeacher && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">监考通知单</h3>
                <p className="text-lg font-medium">{printTeacher} 老师</p>
              </div>
              
              <p className="text-gray-600">您好！本次考试您的监考安排如下，请准时参加：</p>
              
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left font-medium">日期</th>
                      <th className="p-3 text-left font-medium">时间</th>
                      <th className="p-3 text-left font-medium">地点</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments
                      .filter(a => a.teacher === printTeacher)
                      .map((assignment, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">{assignment.date}</td>
                          <td className="p-3">{assignment.startTime} - {assignment.endTime}</td>
                          <td className="p-3">考场 {assignment.location}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  打印
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600 font-medium">正在为您智能计算，请稍候...</p>
        </div>
      )}
    </div>
  );
}

export default App;