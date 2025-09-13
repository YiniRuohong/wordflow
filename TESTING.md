# WordFlow 测试指南

## 🚀 快速开始

### 1. 启动服务

```bash
# 启动后端API服务器 (端口 8000)
cd /Users/andyzhao/Documents/python/wordflow/api
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 启动前端开发服务器 (端口 3000)  
cd /Users/andyzhao/Documents/python/wordflow/web
npm run dev
```

### 2. 运行自动测试

```bash
cd /Users/andyzhao/Documents/python/wordflow
uv run python test_api.py
```

## 🧪 手动测试步骤

### API 端点测试

1. **基础健康检查**
   ```bash
   curl http://localhost:8000/
   curl http://localhost:8000/health
   curl http://localhost:8000/db/info
   ```

2. **浏览器测试**
   - 打开 http://localhost:8000/docs 查看Swagger UI文档
   - 打开 http://localhost:3000 查看Next.js前端应用

### 数据库测试

1. **检查数据库文件**
   ```bash
   ls -la /Users/andyzhao/Documents/python/wordflow/api/wordflow.db*
   ```

2. **直接数据库查询**
   ```bash
   cd /Users/andyzhao/Documents/python/wordflow/api
   sqlite3 wordflow.db ".tables"
   sqlite3 wordflow.db ".schema words_fts"
   ```

## 📁 测试数据

已创建测试用法语单词CSV文件：
- 位置：`/Users/andyzhao/Documents/python/wordflow/test_words.csv`
- 包含10个基础法语单词（衬衫、你好、房子等）
- 格式符合《新大学法语》标准

### CSV格式示例
```csv
lemma,pos,gender,ipa,meaning_zh,lesson,cefr,tags
chemise,n,f,ʃəmiz,衬衫,L1,A1,"衣物,名词"
bonjour,interj,,bɔ̃ʒuʁ,你好,L1,A1,寒暄
```

## 🔍 验证清单

- [x] ✅ 后端API服务器正常启动
- [x] ✅ 前端Next.js服务器正常启动
- [x] ✅ SQLite数据库成功创建
- [x] ✅ FTS5全文检索功能启用
- [x] ✅ 16个数据库表正确创建
- [x] ✅ API文档可访问
- [ ] ⏳ 批量导入API（下一步实现）
- [ ] ⏳ 滚动学习法和SRS算法（待实现）
- [ ] ⏳ 前端页面功能（待实现）

## 🌐 可用链接

| 服务 | URL | 描述 |
|------|-----|------|
| API根端点 | http://localhost:8000/ | API状态检查 |
| API文档 | http://localhost:8000/docs | Swagger UI交互式文档 |
| 数据库信息 | http://localhost:8000/db/info | 数据库表和FTS5状态 |
| 前端应用 | http://localhost:3000 | Next.js前端界面 |

## 📊 当前实现状态

✅ **已完成**：
1. 项目初始化（uv + FastAPI + Next.js）
2. 数据库模型设计（6个核心表）
3. FTS5全文检索配置
4. 基础API框架
5. CORS跨域配置
6. 开发环境配置

⏳ **进行中**：
4. 批量导入API实现

🔄 **待实现**：
5. 滚动学习法和SRS算法
6. 前端UI页面
7. AI例句生成集成

## 🐛 问题排查

如果遇到问题：

1. **端口占用**：
   ```bash
   lsof -ti :8000 | xargs kill -9
   lsof -ti :3000 | xargs kill -9
   ```

2. **数据库权限**：
   ```bash
   chmod 664 /Users/andyzhao/Documents/python/wordflow/api/wordflow.db
   ```

3. **依赖问题**：
   ```bash
   cd api && uv sync
   cd ../web && npm install
   ```