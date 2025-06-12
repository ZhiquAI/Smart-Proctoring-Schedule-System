import * as XLSX from 'xlsx';
import { Assignment } from '../types';

interface PivotData {
  locations: string[];
  timeSlots: {
    date: string;
    startTime: string;
    endTime: string;
    assignmentsByLocation: Record<string, string[]>;
  }[];
}

export const transformAssignmentsToPivot = (assignments: Assignment[]): PivotData => {
  const locations = new Set<string>();
  const timeSlotsMap = new Map<string, {
    date: string;
    startTime: string;
    endTime: string;
    assignmentsByLocation: Record<string, string[]>;
  }>();

  assignments.forEach(assignment => {
    locations.add(assignment.location);
    const timeSlotId = `${assignment.date}_${assignment.startTime}_${assignment.endTime}`;
    
    if (!timeSlotsMap.has(timeSlotId)) {
      timeSlotsMap.set(timeSlotId, {
        date: assignment.date,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        assignmentsByLocation: {}
      });
    }
    
    const slot = timeSlotsMap.get(timeSlotId)!;
    if (!slot.assignmentsByLocation[assignment.location]) {
      slot.assignmentsByLocation[assignment.location] = [];
    }
    slot.assignmentsByLocation[assignment.location].push(assignment.teacher);
  });

  const sortedLocations = Array.from(locations).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  const sortedTimeSlots = Array.from(timeSlotsMap.values()).sort((a, b) => 
    new Date(`${a.date} ${a.startTime}`).getTime() - new Date(`${b.date} ${b.startTime}`).getTime()
  );

  return { locations: sortedLocations, timeSlots: sortedTimeSlots };
};

export const exportToExcel = (assignments: Assignment[], filename: string = '排班结果.xlsx') => {
  if (!assignments || assignments.length === 0) {
    throw new Error('没有可导出的数据');
  }

  const { locations, timeSlots } = transformAssignmentsToPivot(assignments);
  const exportData: (string | number)[][] = [];
  
  // Headers
  const headers = ['日期', '时间', ...locations];
  exportData.push(headers);

  // Group by date for better organization
  const groupedByDate = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, typeof timeSlots>);

  // Add data rows
  Object.keys(groupedByDate)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .forEach(date => {
      groupedByDate[date].forEach(slot => {
        const row = [
          date,
          `${slot.startTime}-${slot.endTime}`,
          ...locations.map(location => {
            const teachers = slot.assignmentsByLocation[location] || [];
            return teachers.join('、');
          })
        ];
        exportData.push(row);
      });
    });

  // Create workbook and worksheet
  const ws = XLSX.utils.aoa_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '排班结果');

  // Set column widths
  const colWidths = [
    { wch: 12 }, // 日期
    { wch: 15 }, // 时间
    ...locations.map(() => ({ wch: 15 })) // 考场
  ];
  ws['!cols'] = colWidths;

  // Download file
  XLSX.writeFile(wb, filename);
};

export const exportHistoricalStats = (stats: Record<string, { count: number; duration: number }>, filename: string = '历史统计.json') => {
  const dataStr = JSON.stringify(stats, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};