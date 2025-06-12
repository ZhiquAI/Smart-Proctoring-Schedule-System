import React, { useState } from 'react';
import { ChevronDown, UserMinus, UserCheck, Lock, Plus, X } from 'lucide-react';
import { Teacher, Session, SpecialTask } from '../types';

interface RulesPanelProps {
  teachers: Teacher[];
  sessions: Session[];
  specialTasks: SpecialTask;
  teacherExclusions: Map<string, Set<string>>;
  onUpdateSpecialTasks: (tasks: SpecialTask) => void;
  onAddExclusion: (teacher: string, sessionId: string, location?: string) => void;
  onRemoveExclusion: (teacher: string, sessionId: string, location?: string) => void;
  className?: string;
}

const RulesPanel: React.FC<RulesPanelProps> = ({
  teachers,
  sessions,
  specialTasks,
  teacherExclusions,
  onUpdateSpecialTasks,
  onAddExclusion,
  onRemoveExclusion,
  className = ''
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedExclusionTeacher, setSelectedExclusionTeacher] = useState('');
  const [selectedDesignatedTeacher, setSelectedDesignatedTeacher] = useState('');
  const [selectedForcedSession, setSelectedForcedSession] = useState('');

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const isExpanded = (section: string) => expandedSections.has(section);

  const handleExclusionChange = (sessionId: string, location: string | undefined, checked: boolean) => {
    if (!selectedExclusionTeacher) return;

    if (checked) {
      onAddExclusion(selectedExclusionTeacher, sessionId, location);
    } else {
      onRemoveExclusion(selectedExclusionTeacher, sessionId, location);
    }
  };

  const addDesignatedTask = () => {
    if (!selectedDesignatedTeacher) return;

    // Get checked items from the designated checkboxes
    const checkboxes = document.querySelectorAll('.designated-checkbox:checked') as NodeListOf<HTMLInputElement>;
    const newTasks = Array.from(checkboxes).map(cb => ({
      teacher: selectedDesignatedTeacher,
      date: cb.dataset.date || '',
      slotId: cb.dataset.sessionId || '',
      location: cb.dataset.location || ''
    }));

    // Remove existing tasks for this teacher and add new ones
    const updatedTasks = {
      ...specialTasks,
      designated: [
        ...specialTasks.designated.filter(t => t.teacher !== selectedDesignatedTeacher),
        ...newTasks
      ]
    };

    onUpdateSpecialTasks(updatedTasks);
  };

  const removeDesignatedTask = (index: number) => {
    const updatedTasks = {
      ...specialTasks,
      designated: specialTasks.designated.filter((_, i) => i !== index)
    };
    onUpdateSpecialTasks(updatedTasks);
  };

  const setForcedAssignments = () => {
    if (!selectedForcedSession) return;

    const session = sessions.find(s => s.id === selectedForcedSession);
    if (!session) return;

    // Get the selected teachers for each location
    const selects = document.querySelectorAll('.forced-teacher-select') as NodeListOf<HTMLSelectElement>;
    const newForcedTasks = Array.from(selects)
      .map(select => ({
        sessionId: selectedForcedSession,
        location: select.dataset.location || '',
        teacher: select.value
      }))
      .filter(task => task.teacher && task.location);

    // Remove existing forced tasks for this session and add new ones
    const updatedTasks = {
      ...specialTasks,
      forced: [
        ...specialTasks.forced.filter(t => t.sessionId !== selectedForcedSession),
        ...newForcedTasks
      ]
    };

    onUpdateSpecialTasks(updatedTasks);
  };

  const removeForcedTask = (index: number) => {
    const updatedTasks = {
      ...specialTasks,
      forced: specialTasks.forced.filter((_, i) => i !== index)
    };
    onUpdateSpecialTasks(updatedTasks);
  };

  const RuleSection: React.FC<{
    id: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ id, title, icon, children }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm text-gray-700">{title}</span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${isExpanded(id) ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {isExpanded(id) && (
        <div className="p-4 bg-white border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Exclusion Rules */}
      <RuleSection
        id="exclusion"
        title="按教师排除"
        icon={<UserMinus className="w-4 h-4 text-red-500" />}
      >
        <div className="space-y-3">
          <select
            value={selectedExclusionTeacher}
            onChange={(e) => setSelectedExclusionTeacher(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">选择教师</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.name}>{teacher.name}</option>
            ))}
          </select>

          {selectedExclusionTeacher && sessions.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {sessions.map(session => {
                const exclusions = teacherExclusions.get(selectedExclusionTeacher) || new Set();
                const isSessionExcluded = exclusions.has(`${session.id}_all`);
                
                return (
                  <div key={session.id} className="border border-gray-200 rounded-md p-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSessionExcluded}
                        onChange={(e) => handleExclusionChange(session.id, undefined, e.target.checked)}
                        className="rounded"
                      />
                      <span className="font-medium text-sm">
                        {session.date} {session.startTime}-{session.endTime}
                      </span>
                    </label>
                    
                    {!isSessionExcluded && (
                      <div className="ml-6 mt-2 space-y-1">
                        {session.slots.map(slot => {
                          const isSlotExcluded = exclusions.has(`${session.id}_${slot.location}`);
                          return (
                            <label key={slot.location} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSlotExcluded}
                                onChange={(e) => handleExclusionChange(session.id, slot.location, e.target.checked)}
                                className="rounded text-sm"
                              />
                              <span className="text-sm text-gray-600">考场 {slot.location}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </RuleSection>

      {/* Designated Tasks */}
      <RuleSection
        id="designated"
        title="指定监考"
        icon={<UserCheck className="w-4 h-4 text-green-500" />}
      >
        <div className="space-y-3">
          <select
            value={selectedDesignatedTeacher}
            onChange={(e) => setSelectedDesignatedTeacher(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">选择教师</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.name}>{teacher.name}</option>
            ))}
          </select>

          {selectedDesignatedTeacher && sessions.length > 0 && (
            <div className="space-y-3">
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
                {sessions.flatMap(session => 
                  session.slots.map(slot => {
                    const isChecked = specialTasks.designated.some(t => 
                      t.teacher === selectedDesignatedTeacher && 
                      t.slotId === session.id && 
                      t.location === slot.location
                    );
                    
                    return (
                      <label key={`${session.id}_${slot.location}`} className="flex items-center gap-2 cursor-pointer p-1">
                        <input
                          type="checkbox"
                          className="designated-checkbox rounded"
                          data-session-id={session.id}
                          data-date={session.date}
                          data-location={slot.location}
                          defaultChecked={isChecked}
                        />
                        <span className="text-xs">
                          {session.date} {session.startTime}-{session.endTime} (考场: {slot.location})
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              
              <button
                onClick={addDesignatedTask}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                确认指定
              </button>
            </div>
          )}

          {/* Designated Tasks List */}
          {specialTasks.designated.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-gray-600">已指定监考：</h5>
              <div className="space-y-1 max-h-32 overflow-y-auto bg-blue-50 p-2 rounded-md border">
                {specialTasks.designated.map((task, index) => {
                  const session = sessions.find(s => s.id === task.slotId);
                  const desc = session 
                    ? `${task.date} ${session.startTime}-${session.endTime} (考场: ${task.location})`
                    : '未知场次';
                  
                  return (
                    <div key={index} className="flex justify-between items-center text-xs bg-white p-2 rounded">
                      <span><strong>{task.teacher}</strong> → {desc}</span>
                      <button
                        onClick={() => removeDesignatedTask(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </RuleSection>

      {/* Forced Assignments */}
      <RuleSection
        id="forced"
        title="锁定安排"
        icon={<Lock className="w-4 h-4 text-orange-500" />}
      >
        <div className="space-y-3">
          <select
            value={selectedForcedSession}
            onChange={(e) => setSelectedForcedSession(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">选择场次</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.date} {session.startTime}-{session.endTime}
              </option>
            ))}
          </select>

          {selectedForcedSession && (
            <div className="space-y-3">
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
                {sessions.find(s => s.id === selectedForcedSession)?.slots.map(slot => {
                  const existingTask = specialTasks.forced.find(t => 
                    t.sessionId === selectedForcedSession && t.location === slot.location
                  );
                  
                  return (
                    <div key={slot.location} className="flex items-center justify-between gap-3 p-2 border-b last:border-b-0">
                      <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
                        考场 {slot.location}
                      </label>
                      <select
                        className="forced-teacher-select flex-1 p-1 border border-gray-300 rounded text-xs"
                        data-location={slot.location}
                        defaultValue={existingTask?.teacher || ''}
                      >
                        <option value="">-- 未锁定 --</option>
                        {teachers.map(teacher => (
                          <option key={teacher.id} value={teacher.name}>{teacher.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
              
              <button
                onClick={setForcedAssignments}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors text-sm font-medium"
              >
                设置锁定安排
              </button>
            </div>
          )}

          {/* Forced Tasks List */}
          {specialTasks.forced.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-gray-600">锁定安排：</h5>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {specialTasks.forced.map((task, index) => {
                  const session = sessions.find(s => s.id === task.sessionId);
                  const sessionDesc = session 
                    ? `${session.date} ${session.startTime}-${session.endTime}`
                    : '未知场次';
                  
                  return (
                    <div key={index} className="flex justify-between items-center text-xs bg-orange-50 p-2 rounded">
                      <span>
                        <strong>{sessionDesc}</strong>, 考场 <strong>{task.location}</strong> → <strong>{task.teacher}</strong>
                      </span>
                      <button
                        onClick={() => removeForcedTask(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </RuleSection>
    </div>
  );
};

export default RulesPanel;