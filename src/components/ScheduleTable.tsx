import React, { useMemo } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Assignment } from '../types';
import { transformAssignmentsToPivot } from '../utils/export';

interface ScheduleTableProps {
  assignments: Assignment[];
  onSwapAssignments: (id1: string, id2: string) => void;
  className?: string;
}

const DraggableTeacher: React.FC<{
  teacher: string;
  assignmentId: string;
  onDrop: (sourceId: string, targetId: string) => void;
}> = ({ teacher, assignmentId, onDrop }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'teacher',
    item: { id: assignmentId, teacher },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'teacher',
    drop: (item: { id: string; teacher: string }) => {
      if (item.id !== assignmentId) {
        onDrop(item.id, assignmentId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const isError = teacher.startsWith('!!');

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`
        px-2 py-1 text-xs rounded border cursor-move transition-all
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isOver ? 'ring-2 ring-blue-400' : ''}
        ${isError 
          ? 'bg-red-100 border-red-300 text-red-700 font-bold' 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
      title={isError ? '' : '拖拽以重新分配'}
    >
      {teacher}
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

  const groupedByDate = useMemo(() => {
    return pivotData.timeSlots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {} as Record<string, typeof pivotData.timeSlots>);
  }, [pivotData.timeSlots]);

  const handleSwap = (sourceId: string, targetId: string) => {
    onSwapAssignments(sourceId, targetId);
  };

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
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
            <tr className="bg-gray-100">
              <th className="p-3 text-xs font-semibold text-center text-gray-600 border w-20 sticky top-0 bg-gray-100 z-10">
                日期
              </th>
              <th className="p-3 text-xs font-semibold text-center text-gray-600 border w-24 sticky top-0 bg-gray-100 z-10">
                时间
              </th>
              {pivotData.locations.map(location => (
                <th 
                  key={location}
                  className="p-3 text-xs font-semibold text-center text-gray-600 border min-w-[120px] sticky top-0 bg-gray-100 z-10"
                >
                  考场 {location}
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
                  <tr key={`${slot.date}_${slot.startTime}_${slot.endTime}`} className="hover:bg-gray-50">
                    {index === 0 && (
                      <td 
                        className="p-3 text-sm text-center align-middle text-gray-700 font-medium border bg-gray-50"
                        rowSpan={slotsForDate.length}
                      >
                        {slot.date.substring(5).replace(/\//g, '-')}
                      </td>
                    )}
                    <td className="p-3 text-xs text-center align-middle text-gray-600 border whitespace-nowrap">
                      {slot.startTime} - {slot.endTime}
                    </td>
                    {pivotData.locations.map(location => {
                      const teachersInSlot = slot.assignmentsByLocation[location] || [];
                      const slotId = `${slot.date}_${slot.startTime}_${slot.endTime}_${location}`;
                      
                      return (
                        <td 
                          key={location}
                          className="p-2 border align-top min-w-[120px]"
                        >
                          <div className="space-y-1">
                            {teachersInSlot.map((teacher, teacherIndex) => {
                              const assignmentId = `${slotId}_${teacherIndex}`;
                              return (
                                <DraggableTeacher
                                  key={assignmentId}
                                  teacher={teacher}
                                  assignmentId={assignmentId}
                                  onDrop={handleSwap}
                                />
                              );
                            })}
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