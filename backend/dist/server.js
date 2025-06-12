"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const ai_1 = __importDefault(require("./routes/ai"));
const security_1 = require("./middleware/security");
// 加载环境变量
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// 安全中间件
app.use(security_1.securityHeaders);
app.use(security_1.apiLimiter);
// CORS 配置
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
// 解析 JSON
app.use(express_1.default.json({ limit: '10mb' }));
// 路由
app.use('/api/ai', ai_1.default);
// 根路径
app.get('/', (req, res) => {
    res.json({
        message: 'Scheduling AI Backend is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});
// 错误处理
app.use(security_1.errorHandler);
// 启动服务器
app.listen(port, () => {
    console.log(`🚀 AI Backend server running on http://localhost:${port}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 AI Provider: ${process.env.DEEPSEEK_API_KEY ? 'Deepseek' : 'OpenAI'}`);
});
exports.default = app;
