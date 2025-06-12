import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Sparkles, X, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import Modal from './ui/Modal';
import aiService from '../services/aiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentRules: any;
  onRulesChange: (newRules: any) => void;
  teachers?: any[];
  schedules?: any[];
  conflicts?: any[];
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({
  isOpen,
  onClose,
  currentRules,
  onRulesChange,
  teachers = [],
  schedules = [],
  conflicts = []
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '您好！我是智能排班助手 🤖\n\n我可以帮您：\n• 用自然语言设置排班规则\n• 分析排班冲突并提供解决方案\n• 根据您的需求生成排班建议\n• 解释当前的规则设置\n\n请告诉我您需要什么帮助！',
      timestamp: new Date(),
      confidence: 1.0
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 检查 AI 服务连接状态
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await aiService.checkHealth();
      setIsConnected(connected);
    };

    if (isOpen) {
      checkConnection();
      const interval = setInterval(checkConnection, 30000); // 每30秒检查一次
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const determineTaskFromInput = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('冲突') || lowerInput.includes('问题') || lowerInput.includes('错误')) {
      return 'ANALYZE_CONFLICT';
    }
    if (lowerInput.includes('建议') || lowerInput.includes('推荐') || lowerInput.includes('怎么安排')) {
      return 'GENERATE_SCHEDULE';
    }
    if (lowerInput.includes('解释') || lowerInput.includes('说明') || lowerInput.includes('什么意思')) {
      return 'EXPLAIN_RULES';
    }
    return 'UPDATE_RULES';
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (!isConnected) {
        throw new Error('AI 服务未连接');
      }

      const task = determineTaskFromInput(userMessage.content);
      const context = {
        task: task as any,
        currentRules,
        teachers,
        schedules,
        conflictInfo: conflicts
      };

      const response = await aiService.sendMessage(
        [...messages, userMessage],
        context
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.textResponse,
        timestamp: new Date(),
        confidence: response.confidence
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 如果 AI 返回了更新的规则，应用它们
      if (response.updatedRules) {
        onRulesChange(response.updatedRules);
      }

    } catch (error) {
      console.error('AI response error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `抱歉，我遇到了一些问题：${error instanceof Error ? error.message : '未知错误'}\n\n请稍后再试，或者尝试使用左侧的手动配置面板。`,
        timestamp: new Date(),
        confidence: 0
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getQuickActions = () => [
    {
      text: "分析当前冲突",
      action: () => setInput("请分析当前的排班冲突并提供解决方案"),
      disabled: conflicts.length === 0
    },
    {
      text: "解释当前规则",
      action: () => setInput("请解释当前设置的排班规则"),
      disabled: !currentRules || (currentRules.designated?.length === 0 && currentRules.forced?.length === 0)
    },
    {
      text: "优化排班建议",
      action: () => setInput("请为当前的教师和考试安排提供优化建议"),
      disabled: teachers.length === 0 || schedules.length === 0
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI 智能助手" size="lg">
      <div className="flex flex-col h-[600px]">
        {/* 连接状态指示器 */}
        <div className={`flex items-center gap-2 px-4 py-2 text-sm ${
          isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>{isConnected ? 'AI 服务已连接' : 'AI 服务未连接 - 使用模拟模式'}</span>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.role === 'assistant' && (
                    <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-xs ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                      {message.role === 'assistant' && message.confidence !== undefined && (
                        <div className={`text-xs px-2 py-1 rounded ${
                          message.confidence > 0.8 ? 'bg-green-100 text-green-700' :
                          message.confidence > 0.5 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {message.confidence === 0 ? '错误' : `置信度 ${Math.round(message.confidence * 100)}%`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 text-gray-800 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-sm">AI 正在思考...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 快捷操作 */}
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {getQuickActions().map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                disabled={action.disabled || isLoading}
                className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {action.text}
              </button>
            ))}
          </div>
        </div>

        {/* 输入区域 */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "用自然语言描述您的排班需求..." : "AI 服务未连接，请检查后端服务"}
              className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              发送
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            💡 提示：您可以说"张老师不能在周一监考"、"分析当前冲突"、"优化排班安排"等
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AIChatPanel;