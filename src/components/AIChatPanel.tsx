import React, { useState } from 'react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import Modal from './ui/Modal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentRules: any;
  onRulesChange: (newRules: any) => void;
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({
  isOpen,
  onClose,
  currentRules,
  onRulesChange
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '您好！我是智能排班助手。您可以用自然语言告诉我排班规则，比如："张老师不能在周一监考"或"每个老师最多连续监考2场"。',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 模拟 AI 响应（实际项目中这里会调用后端 API）
  const simulateAIResponse = async (userInput: string): Promise<string> => {
    // 简单的规则匹配示例
    if (userInput.includes('不能') || userInput.includes('排除')) {
      return '好的，我已经理解您要排除某些教师的特定时段。请在左侧的"按教师排除"面板中进行具体设置。';
    }
    if (userInput.includes('最多') || userInput.includes('连续')) {
      return '明白了，您想设置教师的工作量限制。这个功能将在后续版本中实现。';
    }
    if (userInput.includes('指定') || userInput.includes('安排')) {
      return '收到！您可以在左侧的"指定监考"面板中为特定教师指定监考任务。';
    }
    return '我正在学习中，暂时还不能完全理解您的需求。请尝试使用左侧的规则配置面板进行设置。';
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
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiResponse = await simulateAIResponse(userMessage.content);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI response error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '抱歉，我暂时无法响应。请稍后再试。',
        timestamp: new Date()
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI 智能助手" size="lg">
      <div className="flex flex-col h-[600px]">
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
                  <div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
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
        </div>

        {/* 输入区域 */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="用自然语言描述您的排班需求..."
              className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            💡 提示：您可以说"张老师不能在周一监考"、"每个老师最多连续监考2场"等
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AIChatPanel;