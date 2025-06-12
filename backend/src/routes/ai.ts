import express from 'express';
import AIService from '../services/aiService';
import { aiLimiter } from '../middleware/security';
import { AIMessage, AIContext } from '../types';

const router = express.Router();
const aiService = new AIService();

// AI 聊天接口
router.post('/chat', aiLimiter, async (req, res) => {
  try {
    const { messages, context }: { messages: AIMessage[], context: AIContext } = req.body;

    // 输入验证
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }

    if (!context || !context.task) {
      return res.status(400).json({
        success: false,
        error: 'Context with task is required'
      });
    }

    // 调用 AI 服务
    const result = await aiService.processRequest(messages, context);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process AI request'
    });
  }
});

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI service is running',
    timestamp: new Date().toISOString()
  });
});

export default router;