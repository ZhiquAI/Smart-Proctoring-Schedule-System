import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ProgressModalProps {
  isOpen: boolean;
  progress: number;
  message: string;
  title?: string;
}

const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  progress,
  message,
  title = '正在处理'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" />
        
        {/* Modal Content */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-8">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-6" />
              
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {title}
              </h3>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
              
              {/* Progress Text */}
              <div className="flex justify-between text-sm text-gray-600 mb-4">
                <span>{message}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              
              <p className="text-xs text-gray-500">
                请稍候，系统正在为您智能计算最优排班方案...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressModal;