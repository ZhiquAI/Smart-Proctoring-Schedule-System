import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({ 
  type = 'info', 
  title, 
  message, 
  onClose,
  className = ''
}) => {
  const baseClasses = "p-4 rounded-lg border flex items-start gap-3 relative";
  
  const typeClasses = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800"
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />,
    error: <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />,
    info: <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${className}`}>
      {icons[type]}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
        )}
        <p className="text-sm whitespace-pre-wrap">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;