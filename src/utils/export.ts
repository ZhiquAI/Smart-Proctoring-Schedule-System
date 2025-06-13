import * as XLSX from 'xlsx';
import { Assignment, HistoricalStats } from '../types';

export interface PivotData {
  timeSlots: {
    date: string;
    startTime: string;
    endTime: string;
    assignmentsByLocation: Record<string, string[]>;
  }[];
  locations: string[];
}

// Improved location sorting function
function sortLocations(locations: string[]): string[] {
  return locations.sort((a, b) => {
    // Extract numeric and alphabetic parts
    const parseLocation = (loc: string) => {
      const match = loc.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
      if (match) {
        return {
          prefix: match[1] || '',
          number: parseInt(match[2]) || 0,
          suffix: match[3] || ''
        };
      }
      // If no number found, treat as pure string
      return {
        prefix: loc,
        number: 0,
        suffix: ''
      };
    };

    const locA = parseLocation(a);
    const locB = parseLocation(b);

    // First compare by prefix (A, B, C, etc.)
    if (locA.prefix !== locB.prefix) {
      return locA.prefix.localeCompare(locB.prefix);
    }

    // Then compare by number (101, 102, 103, etc.)
    if (locA.number !== locB.number) {
      return locA.number - locB.number;
    }

    // Finally compare by suffix
    return locA.suffix.localeCompare(locB.suffix);
  });
}

export const transformAssignmentsToPivot = (assignments: Assignment[]): PivotData => {
  const timeSlotMap = new Map<string, {
    date: string;
    startTime: string;
    endTime: string;
    assignmentsByLocation: Record<string, string[]>;
  }>();

  const locationSet = new Set<string>();

  assignments.forEach(assignment => {
    const timeSlotKey = `${assignment.date}_${assignment.startTime}_${assignment.endTime}`;
    
    if (!timeSlotMap.has(timeSlotKey)) {
      timeSlotMap.set(timeSlotKey, {
        date: assignment.date,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        assignmentsByLocation: {}
      });
    }

    const timeSlot = timeSlotMap.get(timeSlotKey)!;
    
    if (!timeSlot.assignmentsByLocation[assignment.location]) {
      timeSlot.assignmentsByLocation[assignment.location] = [];
    }
    
    timeSlot.assignmentsByLocation[assignment.location].push(assignment.teacher);
    locationSet.add(assignment.location);
  });

  const timeSlots = Array.from(timeSlotMap.values()).sort((a, b) => 
    new Date(`${a.date} ${a.startTime}`).getTime() - new Date(`${b.date} ${b.startTime}`).getTime()
  );

  // Use improved sorting for locations
  const locations = sortLocations(Array.from(locationSet));

  return { timeSlots, locations };
};

export const exportToExcel = (assignments: Assignment[], filename: string) => {
  const pivotData = transformAssignmentsToPivot(assignments);
  
  const worksheetData: any[][] = [];
  
  // Header row
  const headers = ['日期', '时间', ...pivotData.locations.map(loc => `考场 ${loc}`)];
  worksheetData.push(headers);

  // Group by date for better organization
  const groupedByDate = pivotData.timeSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, typeof pivotData.timeSlots>);

  Object.keys(groupedByDate)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .forEach(date => {
      const slotsForDate = groupedByDate[date];
      
      slotsForDate.forEach((slot, index) => {
        const row: any[] = [];
        
        // Date column (only for first slot of the date)
        row.push(index === 0 ? slot.date : '');
        
        // Time column
        row.push(`${slot.startTime} - ${slot.endTime}`);
        
        // Location columns
        pivotData.locations.forEach(location => {
          const teachers = slot.assignmentsByLocation[location] || [];
          row.push(teachers.join('\n'));
        });
        
        worksheetData.push(row);
      });
    });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 15 }, // Time
    ...pivotData.locations.map(() => ({ wch: 20 })) // Locations
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '监考安排');
  
  XLSX.writeFile(workbook, filename);
};

export const exportHistoricalStats = (stats: HistoricalStats, filename: string) => {
  const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};