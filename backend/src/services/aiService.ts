import OpenAI from 'openai';
import { AIMessage, AIContext, AIResponse, SpecialTask } from '../types';

class AIService {
  private openai: OpenAI;

  constructor() {
    // 优先使用 Deepseek，fallback 到 OpenAI
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.DEEPSEEK_API_KEY 
      ? 'https://api.deepseek.com' 
      : undefined;

    if (!apiKey) {
      throw new Error('No AI API key provided');
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL
    });
  }

  async processRequest(messages: AIMessage[], context: AIContext): Promise<AIResponse> {
    try {
      switch (context.task) {
        case 'UPDATE_RULES':
          return await this.handleRulesUpdate(messages, context);
        case 'ANALYZE_CONFLICT':
          return await this.handleConflictAnalysis(messages, context);
        case 'GENERATE_SCHEDULE':
          return await this.handleScheduleGeneration(messages, context);
        case 'EXPLAIN_RULES':
          return await this.handleRulesExplanation(messages, context);
        default:
          return await this.handleGeneralChat(messages, context);
      }
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        textResponse: '抱歉，AI 服务暂时不可用。请稍后再试。',
        confidence: 0
      };
    }
  }

  private async handleRulesUpdate(messages: AIMessage[], context: AIContext): Promise<AIResponse> {
    const systemPrompt = `你是一个专业的教务排班助手。用户会用自然语言描述排班规则，你需要：

1. 理解用户的意图
2. 将其转换为具体的排班规则
3. 调用相应的函数来更新规则

当前规则状态：${JSON.stringify(context.currentRules, null, 2)}

可用的规则类型：
- designated: 指定某个教师监考特定场次
- forced: 锁定某个场次的教师安排
- exclusion: 排除某个教师的特定时段

请根据用户输入，识别意图并提供建议。`;

    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'update_scheduling_rules',
          description: '更新排班规则',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['add_designated', 'add_forced', 'add_exclusion', 'remove_rule'],
                description: '要执行的操作'
              },
              teacher: {
                type: 'string',
                description: '教师姓名'
              },
              date: {
                type: 'string',
                description: '日期 (YYYY/MM/DD 格式)'
              },
              location: {
                type: 'string',
                description: '考场位置'
              },
              sessionId: {
                type: 'string',
                description: '场次ID'
              }
            },
            required: ['action']
          }
        }
      }
    ];

    const completion = await this.openai.chat.completions.create({
      model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      tools,
      tool_choice: 'auto',
      temperature: 0.3
    });

    const message = completion.choices[0].message;
    let updatedRules = context.currentRules;

    // 处理函数调用
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.function.name === 'update_scheduling_rules') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          updatedRules = this.applyRuleUpdate(context.currentRules || { designated: [], forced: [] }, args);
        } catch (error) {
          console.error('Error parsing tool call arguments:', error);
        }
      }
    }

    return {
      textResponse: message.content || '规则已更新。',
      updatedRules,
      confidence: 0.8
    };
  }

  private async handleConflictAnalysis(messages: AIMessage[], context: AIContext): Promise<AIResponse> {
    const systemPrompt = `你是一个经验丰富的教务管理专家。用户遇到了排班冲突，请：

1. 分析冲突的根本原因
2. 提供3个具体的解决方案
3. 解释每个方案的优缺点

冲突信息：${JSON.stringify(context.conflictInfo, null, 2)}`;

    const completion = await this.openai.chat.completions.create({
      model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.5
    });

    return {
      textResponse: completion.choices[0].message.content || '无法分析冲突。',
      confidence: 0.9
    };
  }

  private async handleScheduleGeneration(messages: AIMessage[], context: AIContext): Promise<AIResponse> {
    const systemPrompt = `你是一个智能排班算法专家。根据用户的意图和约束条件，提供排班建议。

教师信息：${JSON.stringify(context.teachers, null, 2)}
考试安排：${JSON.stringify(context.schedules, null, 2)}
用户意图：${context.userIntent}`;

    const completion = await this.openai.chat.completions.create({
      model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.4
    });

    return {
      textResponse: completion.choices[0].message.content || '无法生成排班建议。',
      confidence: 0.7
    };
  }

  private async handleRulesExplanation(messages: AIMessage[], context: AIContext): Promise<AIResponse> {
    const systemPrompt = `你是一个友好的教务助手。用简单易懂的语言解释当前的排班规则。

当前规则：${JSON.stringify(context.currentRules, null, 2)}`;

    const completion = await this.openai.chat.completions.create({
      model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.6
    });

    return {
      textResponse: completion.choices[0].message.content || '无法解释规则。',
      confidence: 0.8
    };
  }

  private async handleGeneralChat(messages: AIMessage[], context: AIContext): Promise<AIResponse> {
    const systemPrompt = `你是一个专业的教务排班助手。请友好地回应用户，并引导他们使用具体的功能。`;

    const completion = await this.openai.chat.completions.create({
      model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.7
    });

    return {
      textResponse: completion.choices[0].message.content || '我不太明白您的意思，请尝试更具体的描述。',
      confidence: 0.5
    };
  }

  private applyRuleUpdate(currentRules: SpecialTask, args: any): SpecialTask {
    const newRules = JSON.parse(JSON.stringify(currentRules));

    switch (args.action) {
      case 'add_designated':
        if (args.teacher && args.date && args.location) {
          newRules.designated.push({
            teacher: args.teacher,
            date: args.date,
            slotId: args.sessionId || `${args.date}_session`,
            location: args.location
          });
        }
        break;
      case 'add_forced':
        if (args.teacher && args.sessionId && args.location) {
          newRules.forced.push({
            sessionId: args.sessionId,
            location: args.location,
            teacher: args.teacher
          });
        }
        break;
      // 可以添加更多操作类型
    }

    return newRules;
  }
}

export default AIService;