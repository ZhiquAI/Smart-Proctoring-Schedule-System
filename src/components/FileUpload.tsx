import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
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
  const hasData = uploadedFile && processingResult?.data.length > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* File Drop Zone - Compressed */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-3 transition-all duration-300 cursor-pointer group
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50 scale-105 shadow-lg' 
            : hasData
              ? 'border-green-400 bg-green-50 hover:bg-green-100' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
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
          <div className="flex items-center justify-center gap-2 py-2">
            <LoadingSpinner size="sm" />
            <span className="text-xs text-gray-600">处理中...</span>
          </div>
        ) : uploadedFile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 truncate max-w-32">{uploadedFile.name}</p>
                <p className="text-xs text-green-600">
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
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">
                上传{currentConfig.label}
              </p>
              <p className="text-xs text-gray-500">{currentConfig.description}</p>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Upload className="w-8 h-8 text-blue-500 mx-auto mb-1" />
              <p className="text-blue-700 font-medium text-xs">释放文件以上传</p>
            </div>
          </div>
        )}
      </div>

      {/* Processing Results - Compressed */}
      {processingResult && (
        <div className="space-y-1">
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