import { Router } from 'express';
import { aiService } from '../services/aiService';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid messages format'
      });
    }

    const result = await aiService.getResponse(messages, context || {});

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('AI route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;