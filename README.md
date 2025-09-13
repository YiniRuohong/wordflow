# WordFlow-Py

法语背诵应用（滚动学习法 + SRS），支持批量导入《新大学法语》词表，前后端分离（FastAPI + Next.js）。

## 功能亮点
- 批量导入：CSV/TSV/JSON 上传，后台异步入库，实时进度查询
- 全文检索：SQLite FTS5，支持前缀匹配与相关性（bm25）排序
- 学习调度：滚动学习法（D-1/2/4/7）+ SRS（SM-2）混合队列
- 自适应：根据积压自动降低新卡上限；“疑难（leech）”标记与温和延迟
- 例句扩展：预留 OpenAI Responses/Assistants（断网回退本地）
- 前端：Next.js + MUI + TanStack Query，导入/学习/检索/统计等页面
- Emoji 适配：动画组件按字素簇拆分，Emoji 渲染正确（📥🎉）

## 技术栈
- 后端：FastAPI, SQLAlchemy, SQLite + FTS5, BackgroundTasks
- 前端：Next.js 14, React, MUI, TanStack Query, Tailwind
- 依赖管理：uv（Python），npm（Node）
- 打包：Docker, docker-compose

## 目录结构
```
wordflow/
  api/                # FastAPI 后端
  web/                # Next.js 前端
  docker/             # docker-compose
  README.md
  AGENTS.md
```

## 快速开始（本地）
1. 后端
   - 进入 `api/`，启动：
     ```bash
     uv run uvicorn app.main:app --reload --port 8000
     ```
   - 接口文档：`http://localhost:8000/docs`

2. 前端
   - 进入 `web/`，启动：
     ```bash
     npm install
     npm run dev -- --port 3000
     ```
   - 访问：`http://localhost:3000`

3. 联调
   - 导入：前端 `/import` 上传 CSV → 后端 `/api/v1/words/bulk` → 轮询 `/api/v1/imports/{id}`
   - 学习：前端 `/study`，空格显示答案；1/2/3/4=0/1/2/3 打分
   - 检索：前端 `/search`，输入触发建议（`/api/v1/words/suggest`）

## 一键打包运行（Docker）
前置：本机安装 Docker 与 docker-compose。

```bash
cd docker
docker compose up --build
```

- API 服务：`http://localhost:8000`
- 前端服务：`http://localhost:3000`

环境变量（可按需覆盖）：
- `api/.env.example` 中的 `APP_ORIGINS` 控制 CORS（默认允许 3000）
- `web` 通过 `NEXT_PUBLIC_API_BASE=http://api:8000` 指向容器内 API

## API 速览
- 导入：
  - `POST /api/v1/words/bulk` → `{ import_id }`
  - `GET /api/v1/imports/{id}` → 进度 `{status,total,succeeded,failed,progress_percent}`
- 检索：
  - `GET /api/v1/words/search?q=chem*`
  - `GET /api/v1/words/suggest?q=bon`
- 学习：
  - `GET /api/v1/study/next?limit=30&auto_adjust_new=true`
  - `POST /api/v1/review` → `{card_id, grade}`
- 设置：
  - `GET /api/v1/settings` / `PUT /api/v1/settings`（全局设置）

## 前端页面
- `/import`：批量导入，显示实时进度与历史
- `/study`：今日队列，滚动学习法 + SRS；快捷键支持
- `/search`：全文检索 + 建议；CEFR/课程/词性过滤
- `/stats`：学习统计与趋势
- `/settings`：应用偏好设置（主题/动画、新词/复习条数、通知、本地缓存等），已接入后端

## 开发与测试
- 代码风格：`ruff`、`mypy`（api/ 依赖组 dev）
- 测试（后端）：
  ```bash
  cd api
  PYTHONPATH=. uv run pytest -q
  ```
  - 包含 E2E 测试：导入→进度→检索→学习→复习→建议 全链路

## 设计要点
- FTS5：采用 content=words 的虚拟表 + 触发器同步；bm25 加权（lemma>meaning）提升相关性
- 调度：`due ∪ rolling(D-1/2/4/7) ∪ new`，自适应新卡数量，避免积压
- Leech：累计遗忘次数阈值（>=8）自动打标签并温和延后，降低挫败感
- Emoji：前端动画按字素簇分割，避免大部分 emoji 被拆分

## 常见问题
- 导入显示 0 新增：若词条已存在于当前词库，会跳过重复，导入仍记为成功（无失败）
- CORS：修改 `api/.env` 的 `APP_ORIGINS` 或 docker-compose 中的环境变量
- OpenAI Key：后端持有（`OPENAI_API_KEY`），前端不直连

## 许可证
本项目用于教学与内部验证用途，未附带开源许可证。如需商用请先联系作者或添加适用许可证。

