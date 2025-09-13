# WordFlow - 智能法语学习平台

## 项目概述

WordFlow 是一个现代化的智能法语学习平台，采用 Next.js + FastAPI 全栈架构，提供完整的单词学习、记忆管理和进度追踪功能。

## 技术栈

### 前端 (Web)
- **框架**: Next.js 15.5.3 (App Router)
- **样式**: TailwindCSS 3.4 + shadcn/ui 组件系统
- **图标**: Lucide React 
- **图表**: Recharts
- **动画**: Framer Motion 12.23
- **状态管理**: React Query (TanStack Query)
- **字体**: Inter (支持 Emoji 显示)
- **主题**: 深色模式

### 后端 (API)
- **框架**: FastAPI + SQLAlchemy
- **数据库**: SQLite (支持 FTS5 全文搜索)
- **学习算法**: 间隔重复系统 (SRS)
- **文件处理**: CSV 导入支持
- **运行环境**: Python 3.12 + uv

## 设计系统

### 主色调
- **背景**: `#111827` (主背景), `#1E293B` (次要背景)
- **主色**: `#3B82F6` (蓝色)
- **强调色**: `#F43F5E` (粉色), `#10B981` (绿色)
- **文字**: `#F9FAFB` (主文字), `#9CA3AF` (次要文字)
- **边框**: `#374151`

### UI 特性
- **圆角**: rounded-2xl (2rem) 统一设计语言
- **侧边栏**: 可折叠 (60px ⇄ 280px)
- **响应式设计**: 移动端友好
- **动画效果**: 流畅的转场和交互反馈
- **渐变**: 支持多色渐变背景

## 功能特性

### 1. 词库管理 📚
- **多词库支持**: 支持创建和管理多个词库
- **CSV 导入**: 批量导入单词数据
- **词库统计**: 实时显示单词数量、CEFR 等级分布
- **词库切换**: 支持激活/停用词库

### 2. 单词搜索 🔍
- **全文搜索**: 基于 FTS5 的高性能搜索
- **多字段搜索**: 支持法文、中文、课程、等级等字段
- **筛选功能**: 按词性、等级、课程筛选
- **分页显示**: 优化大数据集显示性能

### 3. 智能学习系统 🧠
- **SRS 算法**: 基于艾宾浩斯遗忘曲线的间隔重复
- **个性化队列**: 根据用户表现调整学习计划
- **多种卡片类型**: 支持基础、翻转、选择题等多种学习模式
- **学习统计**: 实时追踪学习进度和表现

### 4. 数据可视化 📊
- **学习统计图表**: 使用 Recharts 展示学习数据
- **进度追踪**: 可视化学习历程和趋势
- **性能分析**: 详细的学习效果分析报告

### 5. 用户界面 🎨
- **现代化设计**: shadcn/ui 风格的组件系统
- **暗色主题**: 护眼的深色界面
- **流畅动画**: Framer Motion 驱动的交互效果
- **响应式布局**: 适配各种设备尺寸

## 目录结构

```
wordflow/
├── web/                        # 前端项目
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   │   ├── globals.css    # 全局样式和设计系统
│   │   │   ├── layout.tsx     # 根布局
│   │   │   ├── page.tsx       # 首页
│   │   │   ├── study/         # 学习页面
│   │   │   ├── search/        # 搜索页面
│   │   │   ├── wordbooks/     # 词库管理
│   │   │   ├── stats/         # 统计页面
│   │   │   └── settings/      # 设置页面
│   │   ├── components/        # React 组件
│   │   │   ├── ui/           # shadcn/ui 基础组件
│   │   │   ├── navigation/   # 导航组件
│   │   │   ├── layout/       # 布局组件
│   │   │   ├── wordbooks/    # 词库相关组件
│   │   │   ├── study/        # 学习相关组件
│   │   │   └── charts/       # 图表组件
│   │   └── lib/              # 工具库
│   │       ├── api.ts        # API 客户端
│   │       └── utils.ts      # 工具函数
│   ├── public/               # 静态资源
│   │   └── test-words.csv    # 测试数据
│   ├── package.json          # 依赖配置
│   ├── tailwind.config.js    # Tailwind 配置
│   └── postcss.config.js     # PostCSS 配置
└── api/                      # 后端项目
    ├── app/                  # FastAPI 应用
    │   ├── main.py          # 应用入口
    │   ├── models/          # 数据模型
    │   ├── routers/         # API 路由
    │   ├── services/        # 业务逻辑
    │   └── database/        # 数据库配置
    └── pyproject.toml       # Python 依赖
```

## API 接口

### 健康检查
- `GET /health` - 服务健康状态

### 词库管理
- `GET /api/v1/wordbooks/` - 获取词库列表
- `POST /api/v1/wordbooks/` - 创建新词库
- `POST /api/v1/wordbooks/{id}/activate` - 激活词库
- `DELETE /api/v1/wordbooks/{id}` - 删除词库
- `GET /api/v1/wordbooks/{id}/stats` - 词库统计

### 单词管理
- `GET /api/v1/words/search` - 搜索单词
- `POST /api/v1/words/bulk` - 批量导入单词
- `GET /api/v1/stats` - 单词统计

### 学习系统
- `GET /api/v1/study/stats` - 学习统计
- `GET /api/v1/study/next` - 获取学习队列
- `POST /api/v1/review` - 提交学习结果
- `GET /api/v1/study/progress` - 学习进度
- `GET /api/v1/study/due-forecast` - 到期预测

### 导入管理
- `GET /api/v1/imports/{id}` - 导入进度查询
- `GET /api/v1/imports` - 导入历史

## 数据模型

### 单词 (Word)
```typescript
interface Word {
  id: number
  lemma: string           // 词条
  meaning_zh: string      // 中文含义
  pos?: string           // 词性
  gender?: string        // 性别 (法语)
  ipa?: string          // 国际音标
  lesson?: string       // 课程
  cefr?: string         // 欧洲语言标准等级
  tags?: string         // 标签
  created_at: string
  updated_at: string
}
```

### 学习卡片 (StudyCard)
```typescript
interface StudyCard {
  card_id: number
  word_id: number
  lemma: string
  meaning_zh: string
  card_type: 'due' | 'rolling' | 'new'
  priority: number
  template: string
  srs: {
    due?: string         // 到期时间
    interval: number     // 间隔天数
    ease: number         // 难度系数
    reps: number         // 重复次数
    lapses: number       // 失误次数
    retention_rate: number // 记忆保持率
  }
}
```

## 开发和部署

### 环境要求
- Node.js 18+
- Python 3.12+
- uv (Python 包管理器)

### 启动开发服务器

#### 后端
```bash
cd api
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 前端
```bash
cd web
npm run dev
```

### 访问地址
- 前端: http://localhost:3002
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 测试数据

项目包含测试数据文件 `test-words.csv`，包含 42 个法语单词，涵盖 A1-C2 各个等级：

- **A1 级别**: 28 个基础单词 (问候、数字、家庭、动物等)
- **A2 级别**: 6 个单词 (动作、职业、教育)
- **B1 级别**: 4 个单词 (抽象概念)
- **B2 级别**: 2 个单词 (高级动词)
- **C1-C2 级别**: 2 个单词 (学术和高级词汇)

## 特色功能

### 1. 智能间隔重复算法
- 基于 SM-2 算法的改进版本
- 动态调整复习间隔
- 个性化学习曲线

### 2. 全文搜索
- SQLite FTS5 支持
- 中法双语搜索
- 模糊匹配和权重排序

### 3. 现代化 UI/UX
- shadcn/ui 设计系统
- 流畅的动画效果
- 响应式设计

### 4. 实时数据可视化
- 学习进度图表
- 统计数据展示
- 趋势分析

## 版本历史

### v3.0.0 (当前版本)
- ✅ 完整的 UI 现代化升级
- ✅ 从 MUI 迁移到 shadcn/ui
- ✅ TailwindCSS 设计系统
- ✅ 深色主题和响应式设计
- ✅ Emoji 显示支持修复
- ✅ 全功能测试验证完成

### 主要更新内容
1. **设计系统重构**: 采用现代化的 TailwindCSS + shadcn/ui
2. **UI 组件升级**: 所有组件使用新的设计语言
3. **性能优化**: React Query 数据缓存和状态管理
4. **用户体验**: 流畅动画和交互反馈
5. **代码质量**: TypeScript 严格类型检查

## 贡献指南

### 开发规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 代码规范
- 组件采用 shadcn/ui 设计模式
- API 遵循 RESTful 设计原则

### 提交规范
```
feat: 新功能
fix: 错误修复
docs: 文档更新
style: 样式调整
refactor: 代码重构
test: 测试相关
chore: 构建和工具相关
```

## 许可证

本项目采用 MIT 许可证。

---

*最后更新: 2025-09-12*
*版本: v3.0.0*
*状态: ✅ 生产就绪*