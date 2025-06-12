import 'dotenv/config';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIContext {
  task: string;
  currentRules?: any;
  conflictInfo?: any;
  intent?: string;
}

interface AIResponse {
  textResponse: string;
  updatedRules?: any;
  analysis?: any;
}

export class AIService {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    // Try to get API key from environment variables
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (deepseekKey) {
      this.apiKey = deepseekKey;
      this.baseURL = 'https://api.deepseek.com/v1';
      this.model = 'deepseek-chat';
    } else if (openaiKey) {
      this.apiKey = openaiKey;
      this.baseURL = 'https://api.openai.com/v1';
      this.model = 'gpt-3.5-turbo';
    } else {
      // Don't throw error immediately, just log warning
      console.warn('Warning: No AI API key found. Please set DEEPSEEK_API_KEY or OPENAI_API_KEY in .env file');
      this.apiKey = '';
      this.baseURL = '';
      this.model = '';
    }
  }

  async getResponse(messages: ChatMessage[], context: AIContext): Promise<AIResponse> {
    // Check if API key is available
    if (!this.apiKey) {
      return {
        textResponse: '抱歉，AI 服务暂时不可用。请联系管理员配置 API 密钥。',
        updatedRules: null
      };
    }

    try {
      const { task } = context;

      switch (task) {
        case 'UPDATE_SCHEDULING_RULES':
          return await this.handleRulesUpdate(messages, context);
        case 'ANALYZE_CONFLICT':
          return await this.handleConflictAnalysis(messages, context);
        case 'GENERATE_RULES_FROM_INTENT':
          return await this.handleIntentBasedRules(messages, context);
        default:
          return await this.handleGeneralChat(messages, context);
      }
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        textResponse: '抱歉，AI 服务遇到了问题。请稍后再试。',
        updatedRules: null
      };
    }
  }

  private async handleRulesUpdate(messages: ChatMessage[], context: AIContext): Promise<AIResponse> {
    const systemPrompt = `你是一个智能教务助手。用户想要通过自然语言来配置排班规则。

当前规则状态：${JSON.stringify(context.currentRules, null, 2)}

可配置的规则包括：
- maxConsecutiveExams: 最大连续监考场数
- maxExamsPerTeacher: 单个教师最大监考场数
- preferredTimeSlots: 偏好时间段
- excludedTimeSlots: 排除时间段
- workloadBalance: 工作量平衡策略

请根据用户的描述，理解其意图并返回更新后的规则配置。如果用户的描述不够明确，请询问具体细节。`;

    const response = await this.callAI([
      { role: 'system', content: systemPrompt },
      ...messages
    ]);

    // 简单的规则解析逻辑（实际项目中可以使用更复杂的 NLP 处理）
    const userMessage = messages[messages.length - 1]?.content || '';
    const updatedRules = this.parseRulesFromText(userMessage, context.currentRules);

    return {
      textResponse: response,
      updatedRules: updatedRules
    };
  }

  private async handleConflictAnalysis(messages: ChatMessage[], context: AIContext): Promise<AIResponse> {
    const systemPrompt = `你是一个经验丰富的教务管理专家。请分析以下排班冲突，并提供解决方案。

冲突信息：${JSON.stringify(context.conflictInfo, null, 2)}

请提供：
1. 冲突的根本原因分析
2. 3个具体的解决方案
3. 推荐的最佳解决方案`;

    const response = await this.callAI([
      { role: 'system', content: systemPrompt },
      ...messages
    ]);

    return {
      textResponse: response,
      analysis: {
        rootCause: '分析冲突根因...',
        solutions: ['解决方案1', '解决方案2', '解决方案3'],
        recommendation: '推荐方案'
      }
    };
  }

  private async handleIntentBasedRules(messages: ChatMessage[], context: AIContext): Promise<AIResponse> {
    const systemPrompt = `你是一个智能排班助手。用户描述了一个排班意图，请将其转换为具体的规则配置。

用户意图：${context.intent}

请分析意图并生成相应的规则配置。`;

    const response = await this.callAI([
      { role: 'system', content: systemPrompt },
      ...messages
    ]);

    const updatedRules = this.generateRulesFromIntent(context.intent || '');

    return {
      textResponse: response,
      updatedRules: updatedRules
    };
  }

  private async handleGeneralChat(messages: ChatMessage[], context: AIContext): Promise<AIResponse> {
    const systemPrompt = `你是一个智能教务助手，专门帮助用户管理监考排班。请用友好、专业的语气回答用户的问题。`;

    const response = await this.callAI([
      { role: 'system', content: systemPrompt },
      ...messages
    ]);

    return {
      textResponse: response
    };
  }

  private async callAI(messages: ChatMessage[]): Promise<string> {
    if (!this.apiKey) {
      return '抱歉，AI 服务暂时不可用。请联系管理员配置 API 密钥。';
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '抱歉，没有收到有效回复。';
    } catch (error) {
      console.error('API call failed:', error);
      return '抱歉，AI 服务暂时不可用。请稍后再试。';
    }
  }

  private parseRulesFromText(text: string, currentRules: any): any {
    // 简单的文本解析逻辑
    const rules = { ...currentRules };
    
    // 检测数字相关的规则
    const maxExamsMatch = text.match(/最多.*?(\d+).*?场/);
    if (maxExamsMatch) {
      rules.maxExamsPerTeacher = parseInt(maxExamsMatch[1]);
    }

    const consecutiveMatch = text.match(/连续.*?(\d+).*?场/);
    if (consecutiveMatch) {
      rules.maxConsecutiveExams = parseInt(consecutiveMatch[1]);
    }

    return rules;
  }

  private generateRulesFromIntent(intent: string): any {
    // 根据意图生成规则的简单逻辑
    const rules: any = {};

    if (intent.includes('老教师') || intent.includes('年长')) {
      rules.maxExamsPerTeacher = 2;
      rules.maxConsecutiveExams = 1;
      rules.preferredTimeSlots = ['09:00-11:00', '14:00-16:00'];
    }

    if (intent.includes('年轻教师') || intent.includes('新教师')) {
      rules.maxExamsPerTeacher = 4;
      rules.maxConsecutiveExams = 2;
    }

    if (intent.includes('平衡') || intent.includes('公平')) {
      rules.workloadBalance = 'strict';
    }

    return rules;
  }
}

// 创建单例实例
export const aiService = new AIService();

export default aiService