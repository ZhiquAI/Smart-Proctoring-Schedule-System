import express from 'express';
import AIService from '../services/aiService';
import { AIRequest } from '../types';

const router = express.Router();
const aiService = new AIService();

router.post('/chat', async (req, res) => {
  try {
    const { messages, context }: AIRequest = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const response = await aiService.processRequest(messages, context);
    res.json(response);
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ 
      error: 'AI service error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;