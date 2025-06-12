import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { processTeacherFile, processScheduleFile, FileProcessingResult } from '../utils/fileProcessing';
import { Teacher, Schedule } from '../types';
import Alert from './ui/Alert';
import LoadingSpinner from './ui/LoadingSpinner';

interface FileUploadProps {
  type: 'teacher' | 'schedule';
  onDataLoaded: (data: Teacher[] | Schedule[]) => void;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ type, onDataLoaded, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingResult, setProcessingResult] = useState<FileProcessingResult<any> | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const config = {
    teacher: {
      label: '教师名单',
      icon: '👥',
      accept: '.xlsx,.xls,.csv',
      description: '支持Excel或CSV格式',
      processor: processTeacherFile
    },
    schedule: {
      label: '考场安排',
      icon: '📅',
      accept: '.xlsx,.xls,.csv',
      description: '支持Excel或CSV格式',
      processor: processScheduleFile
    }
  };

  const currentConfig = config[type];

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setProcessingResult(null);
    
    try {
      const result = await currentConfig.processor(file);
      setProcessingResult(result);
      
      if (result.errors.length === 0) {
        setUploadedFile(file);
        onDataLoaded(result.data);
      }
    } catch (error) {
      setProcessingResult({
        data: [],
        errors: [error instanceof Error ? error.message : '文件处理失败'],
        warnings: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentConfig.processor, onDataLoaded]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleRemove = useCallback(() => {
    setUploadedFile(null);
    setProcessingResult(null);
    onDataLoaded([]);
  }, [onDataLoaded]);

  const inputId = `file-input-${type}`;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* File Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : uploadedFile 
              ? 'border-green-400 bg-green-50' 
              : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploadedFile && document.getElementById(inputId)?.click()}
      >
        <input
          id={inputId}
          type="file"
          accept={currentConfig.accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-600">处理中...</span>
          </div>
        ) : uploadedFile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {processingResult?.data.length || 0} 条记录
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="p-1 rounded-md hover:bg-red-100 text-red-500 transition-colors"
              title="移除文件"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">
                上传{currentConfig.label}
              </p>
              <p className="text-xs text-gray-500">{currentConfig.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Processing Results */}
      {processingResult && (
        <div className="space-y-2">
          {processingResult.errors.length > 0 && (
            <Alert
              type="error"
              title="处理错误"
              message={processingResult.errors.join('\n')}
            />
          )}
          {processingResult.warnings.length > 0 && (
            <Alert
              type="warning"
              title="警告"
              message={processingResult.warnings.join('\n')}
            />
          )}
          {processingResult.errors.length === 0 && processingResult.data.length > 0 && (
            <Alert
              type="success"
              message={`成功加载 ${processingResult.data.length} 条${currentConfig.label}记录`}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;