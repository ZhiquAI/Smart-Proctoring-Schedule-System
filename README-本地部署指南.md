# 智能监考排班系统 - 本地部署指南

## 📋 系统要求

### 硬件要求
- **内存**: 最低 4GB RAM，推荐 8GB+
- **存储**: 至少 1GB 可用空间
- **处理器**: 支持 ES2020 的现代处理器

### 软件要求
- **Node.js**: 18.0.0 或更高版本 ⭐
- **npm**: 8.0.0 或更高版本（随 Node.js 安装）
- **操作系统**: 
  - Windows 10/11
  - macOS 10.15+ (Catalina)
  - Linux (Ubuntu 18.04+, CentOS 7+)

### 浏览器支持
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 快速部署流程

### 步骤 1: 环境准备

#### 1.1 安装 Node.js
```bash
# 检查是否已安装
node --version
npm --version

# 如果未安装，请访问 https://nodejs.org/ 下载安装
```

#### 1.2 获取项目代码
```bash
# 如果从 Git 仓库获取
git clone <项目地址>
cd scheduling-ai-frontend

# 或者解压项目压缩包到指定目录
```

### 步骤 2: 依赖安装

#### 2.1 一键安装所有依赖（推荐）
```bash
# 在项目根目录执行
npm run install:all
```

#### 2.2 分步安装依赖
```bash
# 前端依赖
npm install

# 后端依赖
cd backend
npm install
cd ..
```

### 步骤 3: 环境配置

#### 3.1 前端环境配置
```bash
# 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件：
```env
# AI Backend Configuration
VITE_AI_BACKEND_URL=http://localhost:3001

# Development
VITE_DEV_MODE=true
```

#### 3.2 后端环境配置
```bash
# 进入后端目录并复制环境变量模板
cd backend
cp .env.example .env
cd ..
```

编辑 `backend/.env` 文件：
```env
# AI API Configuration (二选一，可选)
DEEPSEEK_API_KEY=your_deepseek_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### 步骤 4: AI API 密钥配置（可选）

> **注意**: 此步骤为可选项。不配置 AI 密钥系统仍可正常使用，但 AI 助手将使用模拟模式。

#### 方案一: Deepseek API（推荐 - 性价比高）
1. 访问 [Deepseek 开放平台](https://platform.deepseek.com/)
2. 注册账号并实名认证
3. 创建 API Key
4. 在 `backend/.env` 中设置：
   ```env
   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
   ```

#### 方案二: OpenAI API
1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册账号并绑定支付方式
3. 创建 API Key
4. 在 `backend/.env` 中设置：
   ```env
   OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
   ```

### 步骤 5: 启动服务

#### 5.1 开发模式启动（推荐）

**方法一: 一键启动前后端**
```bash
# 在项目根目录执行
npm run dev:all
```

**方法二: 分别启动**
```bash
# 终端1: 启动后端服务
npm run dev:backend

# 终端2: 启动前端服务（新开终端窗口）
npm run dev
```

#### 5.2 生产模式启动
```bash
# 构建并启动后端
npm run build:backend
npm run start:backend

# 构建前端（新开终端）
npm run build
npm run preview
```

### 步骤 6: 访问系统

🌐 **前端地址**: http://localhost:5173
🔧 **后端地址**: http://localhost:3001
📊 **健康检查**: http://localhost:3001/health

## 📁 项目结构详解

```
scheduling-ai-frontend/
├── 📁 src/                     # 前端源码
│   ├── 📁 components/          # React 组件
│   │   ├── 📁 ui/             # 通用 UI 组件
│   │   ├── AIChatPanel.tsx    # AI 聊天面板
│   │   ├── FileUpload.tsx     # 文件上传组件
│   │   ├── ScheduleTable.tsx  # 排班表格
│   │   └── ...
│   ├── 📁 hooks/              # 自定义 React Hooks
│   ├── 📁 services/           # 服务层（API 调用）
│   ├── 📁 utils/              # 工具函数
│   ├── 📁 workers/            # Web Workers
│   └── 📁 types/              # TypeScript 类型定义
├── 📁 backend/                # 后端源码
│   ├── 📁 src/
│   │   ├── 📁 routes/         # API 路由
│   │   ├── 📁 services/       # 业务逻辑服务
│   │   ├── 📁 middleware/     # Express 中间件
│   │   └── 📁 types/          # 类型定义
│   ├── 📁 dist/               # 编译后的 JS 文件
│   └── package.json           # 后端依赖配置
├── 📁 dist/                   # 前端构建产物
├── 📁 public/                 # 静态资源
├── .env                       # 前端环境变量
├── package.json               # 前端依赖配置
└── README-本地部署指南.md      # 本文档
```

## 🧪 功能测试清单

### ✅ 基础功能测试

1. **文件上传测试**
   - [ ] 上传教师名单（Excel/CSV 格式）
   - [ ] 上传考场安排（Excel/CSV 格式）
   - [ ] 验证数据解析正确性

2. **排班生成测试**
   - [ ] 点击"开始智能分配"
   - [ ] 观察进度条和状态提示
   - [ ] 检查生成的排班结果

3. **数据展示测试**
   - [ ] 查看排班表格显示
   - [ ] 检查统计面板数据
   - [ ] 验证冲突检测功能

### ✅ 高级功能测试

4. **规则配置测试**
   - [ ] 设置教师排除时间
   - [ ] 配置指定监考安排
   - [ ] 设置锁定分配

5. **交互功能测试**
   - [ ] 拖拽调整排班结果
   - [ ] 导出 Excel 文件
   - [ ] 打印监考通知单

6. **数据管理测试**
   - [ ] 导入历史数据
   - [ ] 导出累计统计
   - [ ] 重置所有数据

### ✅ AI 功能测试（需要 API 密钥）

7. **AI 助手测试**
   - [ ] 打开 AI 聊天面板
   - [ ] 测试自然语言输入：
     - "张老师不能在周一监考"
     - "分析当前冲突"
     - "优化排班安排"
   - [ ] 验证 AI 响应和建议

## 📊 数据格式规范

### 教师名单格式要求

**Excel/CSV 表头（必须包含）:**
| 字段名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| 姓名/教师姓名/Name | ✅ | 教师姓名 | 张三 |
| 部门/学院/Department | ❌ | 所属部门 | 数学系 |

**示例数据:**
```csv
姓名,部门
张三,数学系
李四,物理系
王五,化学系
```

### 考场安排格式要求

**Excel/CSV 表头（必须包含）:**
| 字段名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| 日期/考试日期 | ✅ | 考试日期 | 2024/1/15 |
| 开始时间/起始时间 | ✅ | 开考时间 | 09:00 |
| 结束时间/终止时间 | ✅ | 结考时间 | 11:00 |
| 考场/地点/教室 | ✅ | 考场编号 | A101 |
| 人数/监考人数 | ❌ | 需要监考教师数 | 2 |

**示例数据:**
```csv
日期,开始时间,结束时间,考场,人数
2024/1/15,09:00,11:00,A101,2
2024/1/15,14:00,16:00,A102,1
2024/1/16,09:00,11:00,B201,2
```

## 🐛 故障排除指南

### 常见问题 1: 端口被占用

**错误信息**: `Error: listen EADDRINUSE: address already in use :::5173`

**解决方案**:
```bash
# 查看端口占用情况
# Windows
netstat -ano | findstr :5173
netstat -ano | findstr :3001

# macOS/Linux
lsof -i :5173
lsof -i :3001

# 杀死占用进程
# Windows
taskkill /PID <PID> /F

# macOS/Linux
kill -9 <PID>
```

### 常见问题 2: 依赖安装失败

**错误信息**: `npm ERR! code ERESOLVE`

**解决方案**:
```bash
# 清除 npm 缓存
npm cache clean --force

# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json
# Windows 用户使用: rmdir /s node_modules & del package-lock.json

# 重新安装
npm install
```

### 常见问题 3: AI 服务连接失败

**错误信息**: `AI service error: Failed to fetch`

**排查步骤**:
1. 检查后端服务是否启动: http://localhost:3001/health
2. 确认环境变量配置正确
3. 查看浏览器控制台网络请求
4. 检查防火墙设置

### 常见问题 4: 文件上传解析失败

**错误信息**: `文件处理失败` 或 `数据格式错误`

**解决方案**:
1. 确保文件格式为 `.xlsx`, `.xls`, 或 `.csv`
2. 检查表头字段名是否正确
3. 确认数据行不为空
4. 验证日期时间格式

### 常见问题 5: TypeScript 编译错误

**错误信息**: `TS2307: Cannot find module`

**解决方案**:
```bash
# 重新安装类型定义
npm install --save-dev @types/node @types/react @types/react-dom

# 清理并重新构建
npm run build
```

## 🔒 安全与隐私

### 数据安全
- ✅ 所有数据本地处理，不上传外部服务器
- ✅ 支持内网部署，数据不出网
- ✅ 文件上传仅在浏览器内存中处理

### API 密钥安全
- ✅ API 密钥仅存储在本地环境变量中
- ✅ 不会在前端代码中暴露密钥
- ✅ 支持密钥轮换和更新

### 网络安全
- ✅ 内置 CORS 保护
- ✅ 请求频率限制
- ✅ 安全头设置

## 📈 性能优化建议

### 系统性能
- 推荐使用 SSD 硬盘提升文件读写速度
- 8GB+ 内存可支持更大规模数据处理
- 关闭不必要的后台程序

### 浏览器优化
- 使用 Chrome 或 Edge 获得最佳性能
- 启用硬件加速
- 定期清理浏览器缓存

## 📞 技术支持

### 自助排查
1. 📋 查看浏览器控制台错误信息
2. 📋 检查终端输出日志
3. 📋 参考本文档故障排除部分
4. 📋 查看项目 Issues 页面

### 日志收集
```bash
# 前端日志：浏览器 F12 -> Console
# 后端日志：终端输出

# 导出日志（如需技术支持）
npm run dev:backend > backend.log 2>&1
```

### 联系方式
- 📧 技术支持邮箱: [support@example.com]
- 💬 在线文档: [docs.example.com]
- 🐛 问题反馈: [GitHub Issues]

---

## 🎉 部署完成检查清单

- [ ] Node.js 版本 18+ 已安装
- [ ] 前后端依赖安装成功
- [ ] 环境变量配置完成
- [ ] 前端服务启动 (http://localhost:5173)
- [ ] 后端服务启动 (http://localhost:3001)
- [ ] 基础功能测试通过
- [ ] 文件上传功能正常
- [ ] 排班生成功能正常
- [ ] AI 助手连接正常（如已配置）

**🎊 恭喜！您已成功部署智能监考排班系统。开始体验智能排班的便利吧！**

---

*最后更新: 2024年1月*
*版本: v2.0*