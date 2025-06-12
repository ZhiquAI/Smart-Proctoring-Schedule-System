import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, Download, AlertTriangle, CheckCircle, Wand2, FileText, Printer, RotateCcw, Settings, BarChart3 } from 'lucide-react';
import { useScheduling } from './hooks/useScheduling';
import { exportToExcel, exportHistoricalStats } from './utils/export';
import FileUpload from './components/FileUpload';
import ScheduleTable from './components/ScheduleTable';
import StatisticsPanel from './components/StatisticsPanel';
import RulesPanel from './components/RulesPanel';
import Modal from './components/ui/Modal';
import Alert from './components/ui/Alert';
import Card from './components/ui/Card';
import ConfirmModal from './components/ui/ConfirmModal';
import ProgressModal from './components/ui/ProgressModal';
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
    progress,
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
    removeTeacherExclusion,
    resetAllData
  } = useScheduling();

  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
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

  const handleReset = useCallback(() => {
    resetAllData();
    showAlert('success', '成功', '所有数据已重置');
  }, [resetAllData, showAlert]);

  const conflicts = getConflicts();
  const canGenerate = teachers.length > 0 && schedules.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-[1600px] mx-auto p-6 lg:p-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Calendar className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">智能监考排班系统</h1>
            <span className="text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full">
              V2.0
            </span>
          </div>
          <p className="text-gray-600 text-lg">基于智能算法的自动化排班解决方案</p>
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

        {/* Main Content - Adjusted grid layout for wider center panel */}
        <div className="grid grid-cols-12 gap-8">
          {/* Left Panel - Settings - Reduced width */}
          <div className="col-span-12 lg:col-span-2 flex flex-col h-[80vh]">
            {/* File Upload Card - Compact */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>数据导入</span>
                </div>
              }
              className="mb-4"
              padding="sm"
            >
              <div className="space-y-2">
                <FileUpload type="teacher" onDataLoaded={handleTeacherData} />
                <FileUpload type="schedule" onDataLoaded={handleScheduleData} />
              </div>
            </Card>

            {/* Rules Configuration Card - Flexible Height */}
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <Settings className="w-5 h-5 text-green-600" />
                  <span>规则配置</span>
                </div>
              }
              className="flex-1 mb-4 flex flex-col"
              padding="sm"
            >
              <div className="flex-1 overflow-y-auto">
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
            </Card>

            {/* Action Buttons - Fixed at Bottom - Horizontal Layout */}
            <div className="space-y-3">
              {/* Primary Action Button */}
              <button
                onClick={handleGenerateAssignments}
                disabled={!canGenerate || isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3"
              >
                <div className="w-6 h-6 bg-white/20 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <Wand2 className="w-5 h-5" />
                <span>{isLoading ? '分配中...' : '开始智能分配'}</span>
              </button>

              {/* Secondary Actions - Horizontal Layout */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setShowResetModal(true)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重置所有数据</span>
                </button>
              </div>
            </div>
          </div>

          {/* Center Panel - Schedule Preview - Expanded width */}
          <div className="col-span-12 lg:col-span-8">
            <Card 
              title={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span>排班预览</span>
                  </div>
                  
                  {assignments.length > 0 && (
                    <div className="flex items-center gap-3">
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
                        导出Excel
                      </button>
                    </div>
                  )}
                </div>
              }
              className="h-[80vh] flex flex-col"
              padding="sm"
            >
              <div className="flex-1 overflow-hidden">
                <ScheduleTable
                  assignments={assignments}
                  onSwapAssignments={swapAssignments}
                  className="h-full"
                />
              </div>
            </Card>
          </div>

          {/* Right Panel - Statistics - Reduced width */}
          <div className="col-span-12 lg:col-span-2">
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                  <span>数据统计</span>
                </div>
              }
              className="h-[80vh] flex flex-col"
              padding="sm"
            >
              <div className="flex-1 overflow-hidden">
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
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
        title="确认重置"
        message="此操作将清空所有已导入的数据和生成的排班结果，且无法撤销。\n\n您确定要继续吗？"
        confirmText="确认重置"
        cancelText="取消"
        type="danger"
      />

      <ProgressModal
        isOpen={isLoading}
        progress={progress.progress}
        message={progress.message}
        title="智能排班中"
      />

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
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
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
    </div>
  );
}

export default App;