import React, { useMemo } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Move } from 'lucide-react';
import { Assignment } from '../types';
import { transformAssignmentsToPivot } from '../utils/export';

interface ScheduleTableProps {
  assignments: Assignment[];
  onSwapAssignments: (id1: string, id2: string) => void;
  className?: string;
}

interface DragItem {
  id: string;
  teacher: string;
  assignmentIndex: number;
}

const DraggableTeacher: React.FC<{
  teacher: string;
  assignmentIndex: number;
  onDrop: (sourceIndex: number, targetIndex: number) => void;
}> = ({ teacher, assignmentIndex, onDrop }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'teacher',
    item: { id: `assignment_${assignmentIndex}`, teacher, assignmentIndex },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'teacher',
    drop: (item: DragItem) => {
      if (item.assignmentIndex !== assignmentIndex) {
        onDrop(item.assignmentIndex, assignmentIndex);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isError = teacher.startsWith('!!');

  return (
    <div
      ref={(node) => {
        if (!isError) {
          drag(drop(node));
        }
      }}
      className={`
        group relative px-3 py-2 text-xs rounded-lg border transition-all duration-200
        ${isError ? 'cursor-not-allowed' : 'cursor-move'}
        ${isDragging ? 'opacity-50 scale-95 rotate-2 z-50' : ''}
        ${isOver && canDrop ? 'ring-2 ring-blue-400 ring-opacity-75 scale-105' : ''}
        ${isError 
          ? 'bg-red-100 border-red-300 text-red-700 font-bold' 
          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50'
        }
      `}
      title={isError ? '分配错误，无法拖拽' : '拖拽以重新分配'}
    >
      <div className="flex items-center gap-1">
        {!isError && (
          <Move className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
        )}
        <span className="font-medium">{teacher}</span>
      </div>
      
      {/* Drag indicator */}
      {!isError && (
        <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 rounded-lg transition-opacity pointer-events-none" />
      )}
    </div>
  );
};

const ScheduleTable: React.FC<ScheduleTableProps> = ({ 
  assignments, 
  onSwapAssignments, 
  className = '' 
}) => {
  const pivotData = useMemo(() => 
    transformAssignmentsToPivot(assignments), 
    [assignments]
  );

  // Sort locations numerically for better order
  const sortedLocations = useMemo(() => {
    return pivotData.locations.sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      
      // If both are numbers, sort numerically
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      
      // Otherwise, sort alphabetically
      return a.localeCompare(b, 'zh-CN', { numeric: true });
    });
  }, [pivotData.locations]);

  const groupedByDate = useMemo(() => {
    return pivotData.timeSlots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {} as Record<string, typeof pivotData.timeSlots>);
  }, [pivotData.timeSlots]);

  const handleSwap = (sourceIndex: number, targetIndex: number) => {
    // Use the actual assignment indices to swap
    if (sourceIndex >= 0 && targetIndex >= 0 && sourceIndex < assignments.length && targetIndex < assignments.length) {
      const sourceAssignment = assignments[sourceIndex];
      const targetAssignment = assignments[targetIndex];
      
      if (sourceAssignment && targetAssignment) {
        // Create unique IDs for the swap operation
        const sourceId = `${sourceAssignment.date}_${sourceAssignment.startTime}_${sourceAssignment.endTime}_${sourceAssignment.location}_${sourceIndex}`;
        const targetId = `${targetAssignment.date}_${targetAssignment.startTime}_${targetAssignment.endTime}_${targetAssignment.location}_${targetIndex}`;
        
        onSwapAssignments(sourceId, targetId);
      }
    }
  };

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center h-full">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-500 mb-2">等待生成排班结果...</h3>
        <p className="text-gray-400">请先在左侧完成设置并点击"开始分配"</p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`overflow-auto ${className}`}>
        <table className="min-w-full text-sm border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-100 to-gray-50">
              <th className="p-4 text-xs font-bold text-center text-gray-700 border border-gray-200 w-24 sticky top-0 bg-gray-100 z-10">
                日期
              </th>
              <th className="p-4 text-xs font-bold text-center text-gray-700 border border-gray-200 w-32 sticky top-0 bg-gray-100 z-10">
                时间段
              </th>
              {sortedLocations.map(location => (
                <th 
                  key={location}
                  className="p-4 text-xs font-bold text-center text-gray-700 border border-gray-200 min-w-[140px] sticky top-0 bg-gray-100 z-10"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>考场</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-mono">
                      {location}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(groupedByDate)
              .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
              .map(date => {
                const slotsForDate = groupedByDate[date];
                
                return slotsForDate.map((slot, index) => (
                  <tr key={`${slot.date}_${slot.startTime}_${slot.endTime}`} className="hover:bg-blue-50/50 transition-colors">
                    {index === 0 && (
                      <td 
                        className="p-4 text-sm text-center align-middle text-gray-800 font-bold border border-gray-200 bg-gradient-to-r from-blue-50 to-blue-25"
                        rowSpan={slotsForDate.length}
                      >
                        <div className="writing-mode-vertical">
                          {slot.date.substring(5).replace(/\//g, '-')}
                        </div>
                      </td>
                    )}
                    <td className="p-4 text-xs text-center align-middle text-gray-700 border border-gray-200 whitespace-nowrap font-medium">
                      <div className="bg-gray-50 px-2 py-1 rounded-md">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </td>
                    {sortedLocations.map(location => {
                      const teachersInSlot = slot.assignmentsByLocation[location] || [];
                      
                      return (
                        <td 
                          key={location}
                          className="p-3 border border-gray-200 align-top min-w-[140px] bg-white"
                        >
                          <div className="space-y-2 min-h-[60px]">
                            {teachersInSlot.length > 0 ? (
                              teachersInSlot.map((teacher, teacherIndex) => {
                                // Find the actual assignment index in the original assignments array
                                const assignmentIndex = assignments.findIndex(a => 
                                  a.date === slot.date &&
                                  a.startTime === slot.startTime &&
                                  a.endTime === slot.endTime &&
                                  a.location === location &&
                                  a.teacher === teacher
                                );
                                
                                return (
                                  <DraggableTeacher
                                    key={`${slot.date}_${slot.startTime}_${slot.endTime}_${location}_${teacherIndex}`}
                                    teacher={teacher}
                                    assignmentIndex={assignmentIndex}
                                    onDrop={handleSwap}
                                  />
                                );
                              })
                            ) : (
                              <div className="text-center py-4 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-lg">
                                暂无安排
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ));
              })}
          </tbody>
        </table>
      </div>
    </DndProvider>
  );
};

export default ScheduleTable;