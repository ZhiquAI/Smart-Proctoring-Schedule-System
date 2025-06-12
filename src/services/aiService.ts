interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface AIContext {
  task: 'UPDATE_RULES' | 'ANALYZE_CONFLICT' | 'GENERATE_SCHEDULE' | 'EXPLAIN_RULES';
  currentRules?: any;
  teachers?: any[];
  schedules?: any[];
  conflictInfo?: any;
  userIntent?: string;
}

interface AIResponse {
  textResponse: string;
  updatedRules?: any;
  suggestions?: string[];
  confidence?: number;
}

class FrontendAIService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:3001';
  }

  async sendMessage(messages: AIMessage[], context: AIContext): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'AI request failed');
      }

      return result.data;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('无法连接到 AI 服务，请检查网络连接');
    }
  }

  async analyzeConflicts(conflicts: any[]): Promise<string> {
    try {
      const response = await this.sendMessage(
        [{ role: 'user', content: '请分析这些排班冲突并提供解决方案' }],
        {
          task: 'ANALYZE_CONFLICT',
          conflictInfo: conflicts
        }
      );
      return response.textResponse;
    } catch (error) {
      return '冲突分析服务暂时不可用';
    }
  }

  async generateScheduleSuggestions(intent: string, teachers: any[], schedules: any[]): Promise<string> {
    try {
      const response = await this.sendMessage(
        [{ role: 'user', content: intent }],
        {
          task: 'GENERATE_SCHEDULE',
          userIntent: intent,
          teachers,
          schedules
        }
      );
      return response.textResponse;
    } catch (error) {
      return '排班建议生成服务暂时不可用';
    }
  }

  async explainRules(rules: any): Promise<string> {
    try {
      const response = await this.sendMessage(
        [{ role: 'user', content: '请解释当前的排班规则' }],
        {
          task: 'EXPLAIN_RULES',
          currentRules: rules
        }
      );
      return response.textResponse;
    } catch (error) {
      return '规则解释服务暂时不可用';
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/ai/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default new FrontendAIService();