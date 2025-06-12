interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIContext {
  task: string;
  currentRules?: any;
  conflictInfo?: any;
  teachers?: any[];
  schedules?: any[];
  userIntent?: string;
}

interface AIResponse {
  textResponse: string;
  updatedRules?: any;
  confidence: number;
}

class AIService {
  private backendUrl: string;

  constructor() {
    this.backendUrl = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:3001';
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/api/ai/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.warn('AI service health check failed:', error);
      return false;
    }
  }

  async sendMessage(messages: ChatMessage[], context: AIContext): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.backendUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          context
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'AI service returned an error');
      }

      return data.data;
    } catch (error) {
      console.error('AI service error:', error);
      
      // Return a fallback response for demo purposes
      return this.getFallbackResponse(messages, context);
    }
  }

  private getFallbackResponse(messages: ChatMessage[], context: AIContext): AIResponse {
    const userMessage = messages[messages.length - 1]?.content || '';
    
    // Simple pattern matching for demo
    if (userMessage.includes('冲突') || userMessage.includes('问题')) {
      return {
        textResponse: '我检测到您提到了冲突问题。由于AI服务暂时不可用，建议您：\n\n1. 检查是否有教师在同一时间被安排到多个考场\n2. 确认教师的排除时间设置是否正确\n3. 查看是否有强制分配导致的时间冲突\n\n您可以使用左侧的手动配置功能来调整规则。',
        confidence: 0.7
      };
    }
    
    if (userMessage.includes('规则') || userMessage.includes('设置')) {
      return {
        textResponse: '关于排班规则设置，您可以：\n\n1. 使用"按教师排除"功能设置教师不可用的时间\n2. 使用"指定监考"功能为特定教师分配固定场次\n3. 使用"锁定安排"功能强制某个场次的教师安排\n\n这些功能都在左侧的规则配置面板中。',
        confidence: 0.8
      };
    }
    
    return {
      textResponse: '抱歉，AI服务暂时不可用。您可以使用左侧的手动配置功能来设置排班规则，或者稍后再试。\n\n如果您需要帮助，可以：\n1. 查看界面上的提示信息\n2. 使用手动配置功能\n3. 联系技术支持',
      confidence: 0.5
    };
  }
}

export default new AIService();