# 智能监考排班系统 - 本地部署指南

## 📋 系统要求

- Node.js 18+ 
- npm 或 yarn
- 现代浏览器（Chrome、Firefox、Safari、Edge）

## 🚀 快速开始

### 1. 克隆项目（如果从 Git 获取）
```bash
git clone <项目地址>
cd scheduling-ai-frontend
```

### 2. 安装依赖

#### 前端依赖
```bash
# 在项目根目录
npm install
```

#### 后端依赖
```bash
# 进入后端目录
cd backend
npm install
cd ..
```

### 3. 环境配置

#### 前端环境配置
```bash
# 在项目根目录创建 .env 文件
cp .env.example .env
```

编辑 `.env` 文件：
```env
# AI Backend Configuration
VITE_AI_BACKEND_URL=http://localhost:3001

# Development
VITE_DEV_MODE=true
```

#### 后端环境配置
```bash
# 在 backend 目录创建 .env 文件
cd backend
cp .env.example .env
```

编辑 `backend/.env` 文件：
```env
# AI API Configuration (选择其中一个)
DEEPSEEK_API_KEY=your_deepseek_api_key_here
# 或者
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### 4. 获取 AI API 密钥（可选）

#### 方案一：Deepseek API（推荐，性价比高）
1. 访问 [Deepseek 开放平台](https://platform.deepseek.com/)
2. 注册账号并获取 API Key
3. 在 `backend/.env` 中设置 `DEEPSEEK_API_KEY=your_key_here`

#### 方案二：OpenAI API
1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 获取 API Key
3. 在 `backend/.env` 中设置 `OPENAI_API_KEY=your_key_here`

**注意：** 如果不配置 AI API 密钥，系统仍可正常使用，但 AI 助手功能将使用模拟模式。

### 5. 启动服务

#### 方法一：分别启动（推荐用于开发）

**启动后端服务：**
```bash
# 在 backend 目录
cd backend
npm run dev
```
后端服务将在 http://localhost:3001 启动

**启动前端服务：**
```bash
# 在项目根目录（新开一个终端）
npm run dev
```
前端服务将在 http://localhost:5173 启动

#### 方法二：生产模式启动

**构建并启动后端：**
```bash
cd backend
npm run build
npm start
```

**构建并预览前端：**
```bash
# 在项目根目录
npm run build
npm run preview
```

## 🌐 访问系统

打开浏览器访问：http://localhost:5173

## 📁 项目结构

```
scheduling-ai-frontend/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── hooks/             # 自定义 Hooks
│   ├── services/          # 服务层
│   ├── utils/             # 工具函数
│   └── types/             # TypeScript 类型定义
├── backend/               # 后端源码
│   ├── src/
│   │   ├── routes/        # API 路由
│   │   ├── services/      # 业务逻辑
│   │   ├── middleware/    # 中间件
│   │   └── types/         # 类型定义
│   └── dist/              # 编译后的文件
├── dist/                  # 前端构建产物
└── public/                # 静态资源
```

## 🔧 功能测试

### 1. 基础功能测试
1. 上传教师名单（Excel/CSV 格式）
2. 上传考场安排（Excel/CSV 格式）
3. 点击"开始智能分配"生成排班
4. 查看排班结果和统计信息

### 2. AI 功能测试（需要 API 密钥）
1. 点击"AI 智能助手"按钮
2. 尝试自然语言输入，如：
   - "张老师不能在周一监考"
   - "分析当前冲突"
   - "优化排班安排"

### 3. 高级功能测试
1. 使用规则配置面板设置排除、指定、锁定规则
2. 拖拽调整排班结果
3. 导出 Excel 文件
4. 打印监考通知单

## 🐛 常见问题

### 问题1：端口被占用
```bash
# 查看端口占用
lsof -i :5173  # 前端端口
lsof -i :3001  # 后端端口

# 杀死占用进程
kill -9 <PID>
```

### 问题2：依赖安装失败
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 问题3：AI 服务连接失败
- 检查后端服务是否启动
- 确认 API 密钥配置正确
- 查看浏览器控制台错误信息

### 问题4：文件上传失败
- 确保文件格式为 Excel (.xlsx, .xls) 或 CSV
- 检查文件表头是否包含必要字段
- 查看文件处理错误提示

## 📊 数据格式要求

### 教师名单格式
| 姓名 | 部门（可选） |
|------|-------------|
| 张三 | 数学系       |
| 李四 | 物理系       |

### 考场安排格式
| 日期 | 开始时间 | 结束时间 | 考场 | 人数（可选） |
|------|----------|----------|------|-------------|
| 2024/1/15 | 09:00 | 11:00 | A101 | 2 |
| 2024/1/15 | 14:00 | 16:00 | A102 | 1 |

## 🔒 安全说明

- 本系统为本地部署，数据不会上传到外部服务器
- AI API 密钥仅用于调用 AI 服务，请妥善保管
- 建议在内网环境中使用

## 📞 技术支持

如遇到问题，请：
1. 查看浏览器控制台错误信息
2. 检查终端输出日志
3. 参考本文档的常见问题部分
4. 联系技术支持团队

---

🎉 恭喜！您已成功部署智能监考排班系统。开始体验智能排班的便利吧！