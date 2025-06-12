import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai';
import { securityHeaders, apiLimiter, errorHandler } from './middleware/security';

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// 安全中间件
app.use(securityHeaders);
app.use(apiLimiter);

// CORS 配置
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// 解析 JSON
app.use(express.json({ limit: '10mb' }));

// 路由
app.use('/api/ai', aiRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: 'Scheduling AI Backend is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 AI Backend server running on http://localhost:${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 AI Provider: ${process.env.DEEPSEEK_API_KEY ? 'Deepseek' : 'OpenAI'}`);
});

export default app;