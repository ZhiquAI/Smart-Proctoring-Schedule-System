import React from 'react';
import { Check, FileText, Settings, Wand2 } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface StepIndicatorProps {
  currentStep: number;
  steps: Step[];
  className?: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ 
  currentStep, 
  steps, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isUpcoming = stepNumber > currentStep;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              {/* Step Circle */}
              <div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                  ${isCompleted 
                    ? 'bg-green-500 text-white shadow-lg' 
                    : isCurrent 
                      ? 'bg-blue-500 text-white shadow-lg ring-4 ring-blue-200' 
                      : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <span className="w-6 h-6 flex items-center justify-center">
                    {step.icon}
                  </span>
                )}
              </div>

              {/* Step Info */}
              <div className="mt-3 text-center max-w-24">
                <p
                  className={`
                    text-sm font-medium transition-colors
                    ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'}
                  `}
                >
                  {step.title}
                </p>
                <p
                  className={`
                    text-xs mt-1 transition-colors
                    ${isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'}
                  `}
                >
                  {step.description}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  flex-1 h-0.5 mx-4 transition-colors duration-300
                  ${stepNumber < currentStep ? 'bg-green-500' : 'bg-gray-200'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;

// Default steps for the scheduling system
export const defaultSteps: Step[] = [
  {
    id: 'upload',
    title: '数据导入',
    description: '上传文件',
    icon: <FileText className="w-4 h-4" />
  },
  {
    id: 'rules',
    title: '规则配置',
    description: '设置规则',
    icon: <Settings className="w-4 h-4" />
  },
  {
    id: 'generate',
    title: '智能分配',
    description: '生成排班',
    icon: <Wand2 className="w-4 h-4" />
  }
];