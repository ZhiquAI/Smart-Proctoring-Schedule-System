# AI 集成部署指南

## 🚀 快速开始

### 1. 后端服务部署

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加您的 API 密钥

# 开发模式启动
npm run dev

# 生产模式部署
npm run build
npm start
```

### 2. 前端配置

```bash
# 在项目根目录
cp .env.example .env.local
# 编辑 .env.local，设置后端服务地址
```

### 3. API 密钥获取

#### Deepseek API (推荐)
1. 访问 [Deepseek 开放平台](https://platform.deepseek.com/)
2. 注册账号并获取 API Key
3. 在 `backend/.env` 中设置 `DEEPSEEK_API_KEY`

#### OpenAI API (备选)
1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 获取 API Key
3. 在 `backend/.env` 中设置 `OPENAI_API_KEY`

## 🧪 功能测试

### Level 1: 基础对话
- [x] 自然语言规则配置
- [x] 实时响应和反馈
- [x] 错误处理和降级

### Level 2: 冲突分析
- [x] 智能冲突检测
- [x] 根因分析
- [x] 解决方案建议

### Level 3: 高级功能
- [x] 意图理解
- [x] 场景化排班
- [x] 学习用户偏好

## 📊 性能监控

### 后端监控
```bash
# 查看服务状态
curl http://localhost:3001/api/ai/health

# 监控日志
npm run dev # 开发模式会显示详细日志
```

### 前端监控
- 打开浏览器开发者工具
- 查看 Network 标签页中的 AI API 请求
- 检查 Console 中的错误信息

## 🔧 故障排除

### 常见问题

1. **AI 服务未连接**
   - 检查后端服务是否启动
   - 验证 API 密钥是否正确
   - 确认网络连接正常

2. **响应速度慢**
   - 检查 API 配额是否充足
   - 考虑切换到更快的模型
   - 优化 Prompt 长度

3. **功能不准确**
   - 调整 Prompt 模板
   - 增加更多上下文信息
   - 使用更强大的模型

## 🚀 生产部署

### 后端部署 (推荐使用 Docker)

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

### 环境变量配置

```bash
# 生产环境必需的环境变量
NODE_ENV=production
PORT=3001
DEEPSEEK_API_KEY=your_api_key
FRONTEND_URL=https://your-frontend-domain.com
```

### 安全建议

1. **API 密钥安全**
   - 使用环境变量存储
   - 定期轮换密钥
   - 监控使用量

2. **访问控制**
   - 配置 CORS 白名单
   - 实施 API 限流
   - 添加身份验证

3. **数据保护**
   - 不记录敏感信息
   - 实施数据加密
   - 定期安全审计

## 📈 扩展功能

### 即将推出的功能

1. **多语言支持**
   - 英文界面
   - 多语言 Prompt

2. **高级分析**
   - 排班效率分析
   - 教师满意度预测
   - 历史数据挖掘

3. **集成能力**
   - 邮件通知
   - 日历同步
   - 第三方系统对接

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发环境设置
```bash
# 克隆项目
git clone <repository-url>

# 安装依赖
npm install
cd backend && npm install

# 启动开发服务
npm run dev # 前端
cd backend && npm run dev # 后端
```

### 代码规范
- 使用 TypeScript
- 遵循 ESLint 规则
- 添加适当的注释
- 编写测试用例

---

🎉 恭喜！您已经成功集成了 AI 功能。如有问题，请查看文档或提交 Issue。