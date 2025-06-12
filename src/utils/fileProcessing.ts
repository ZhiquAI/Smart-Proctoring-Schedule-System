import * as XLSX from 'xlsx';
import { Teacher, Schedule } from '../types';

export interface FileProcessingResult<T> {
  data: T[];
  errors: string[];
  warnings: string[];
}

export const processTeacherFile = async (file: File): Promise<FileProcessingResult<Teacher>> => {
  const result: FileProcessingResult<Teacher> = {
    data: [],
    errors: [],
    warnings: []
  };

  try {
    const data = await readFile(file);
    const { headers, rows } = parseFileData(data, file.name);

    if (rows.length === 0) {
      result.errors.push('文件中没有找到有效的数据行');
      return result;
    }

    // Find header indices
    const nameIndex = findHeaderIndex(headers, ['姓名', '教师姓名', '教师名称', '老师', '教师', '名字', 'Name', 'name']);
    const deptIndex = findHeaderIndex(headers, ['部门', '学院', '科室', '系别', '单位', 'department', 'dept']);

    if (nameIndex === -1) {
      result.errors.push('教师名单中未找到"姓名"列。请检查表头。');
      return result;
    }

    const teachers: Teacher[] = [];
    const duplicateNames = new Set<string>();
    const nameSet = new Set<string>();

    rows.forEach((row, index) => {
      const name = getCellValue(row[nameIndex]);
      if (!name) {
        result.warnings.push(`第 ${index + 2} 行：姓名为空，已跳过`);
        return;
      }

      if (nameSet.has(name)) {
        duplicateNames.add(name);
      } else {
        nameSet.add(name);
      }

      const department = deptIndex !== -1 ? getCellValue(row[deptIndex]) : '';

      teachers.push({
        id: `teacher_${Date.now()}_${index}`,
        name,
        department
      });
    });

    if (duplicateNames.size > 0) {
      result.warnings.push(`发现重复姓名：${Array.from(duplicateNames).join(', ')}`);
    }

    result.data = teachers;
    
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : '文件处理失败');
  }

  return result;
};

export const processScheduleFile = async (file: File): Promise<FileProcessingResult<Schedule>> => {
  const result: FileProcessingResult<Schedule> = {
    data: [],
    errors: [],
    warnings: []
  };

  try {
    const data = await readFile(file);
    const { headers, rows } = parseFileData(data, file.name);

    if (rows.length === 0) {
      result.errors.push('文件中没有找到有效的数据行');
      return result;
    }

    // Find header indices
    const dateIndex = findHeaderIndex(headers, ['日期', '考试日期', 'date', '时间']);
    const startIndex = findHeaderIndex(headers, ['开始时间', '起始时间', 'start', 'startTime', '开始', '开考时间']);
    const endIndex = findHeaderIndex(headers, ['结束时间', '终止时间', 'end', 'endTime', '结束', '结考时间']);
    const locationIndex = findHeaderIndex(headers, ['考场', '地点', '教室', 'location', '场地', '考试地点']);
    const requiredIndex = findHeaderIndex(headers, ['人数', '需求人数', '监考人数', 'required', '需求', '监考教师数']);

    const missingFields = [];
    if (dateIndex === -1) missingFields.push('日期');
    if (startIndex === -1) missingFields.push('开始时间');
    if (endIndex === -1) missingFields.push('结束时间');
    if (locationIndex === -1) missingFields.push('考场');

    if (missingFields.length > 0) {
      result.errors.push(`考场安排表缺少必要字段：${missingFields.join('、')}`);
      return result;
    }

    const schedules: Schedule[] = [];

    rows.forEach((row, index) => {
      try {
        const date = parseDate(getCellValue(row[dateIndex]));
        const startTime = parseTime(getCellValue(row[startIndex]));
        const endTime = parseTime(getCellValue(row[endIndex]));
        const location = getCellValue(row[locationIndex]);
        const required = requiredIndex !== -1 ? parseInt(getCellValue(row[requiredIndex]) || '1') || 1 : 1;

        if (!date || !startTime || !endTime || !location) {
          result.warnings.push(`第 ${index + 2} 行：数据不完整，已跳过`);
          return;
        }

        schedules.push({
          id: `${date}_${startTime}_${endTime}_${location}`,
          date,
          startTime,
          endTime,
          location,
          required: Math.max(1, required)
        });
      } catch (error) {
        result.warnings.push(`第 ${index + 2} 行：数据格式错误，已跳过`);
      }
    });

    result.data = schedules;
    
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : '文件处理失败');
  }

  return result;
};

async function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

function parseFileData(data: ArrayBuffer, filename: string): { headers: string[], rows: any[][] } {
  const fileExtension = filename.toLowerCase().split('.').pop();
  
  if (fileExtension === 'csv') {
    return parseCSV(data);
  } else {
    return parseExcel(data);
  }
}

function parseCSV(data: ArrayBuffer): { headers: string[], rows: any[][] } {
  let text: string;
  try {
    text = new TextDecoder('utf-8').decode(data);
  } catch {
    try {
      text = new TextDecoder('gbk').decode(data);
    } catch {
      text = new TextDecoder('iso-8859-1').decode(data);
    }
  }

  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows = lines.map(line => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }).filter(row => row.some(cell => cell.length > 0));

  return {
    headers: rows[0] || [],
    rows: rows.slice(1)
  };
}

function parseExcel(data: ArrayBuffer): { headers: string[], rows: any[][] } {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true });

  const validRows = jsonData.filter((row: any) => 
    Array.isArray(row) && row.some((cell: any) => 
      cell !== null && cell !== undefined && cell.toString().trim() !== ''
    )
  ) as any[][];

  return {
    headers: validRows[0] || [],
    rows: validRows.slice(1)
  };
}

function findHeaderIndex(headers: string[], possibleNames: string[]): number {
  return headers.findIndex(header => 
    possibleNames.includes(header?.toString().trim())
  );
}

function getCellValue(cell: any): string {
  if (cell === null || cell === undefined) return '';
  return cell.toString().trim();
}

function parseDate(value: string): string | null {
  if (!value) return null;

  // Try parsing YYYY-MM-DD format
  const match = value.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    return `${year}/${month}/${day}`;
  }

  // Try parsing as Excel serial number
  const serial = parseFloat(value);
  if (!isNaN(serial)) {
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + serial * 86400000);
    if (!isNaN(jsDate.getTime())) {
      return `${jsDate.getFullYear()}/${jsDate.getMonth() + 1}/${jsDate.getDate()}`;
    }
  }

  return null;
}

function parseTime(value: string): string | null {
  if (!value) return null;

  // Try parsing HH:MM format
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Try parsing as Excel time fraction
  const serial = parseFloat(value);
  if (!isNaN(serial) && serial >= 0 && serial < 1) {
    const totalMinutes = Math.round(serial * 1440);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  return null;
}