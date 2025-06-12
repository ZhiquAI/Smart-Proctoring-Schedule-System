"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aiService_1 = __importDefault(require("../services/aiService"));
const security_1 = require("../middleware/security");
const router = express_1.default.Router();
const aiService = new aiService_1.default();
// AI 聊天接口
router.post('/chat', security_1.aiLimiter, async (req, res) => {
    try {
        const { messages, context } = req.body;
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
    }
    catch (error) {
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
exports.default = router;
