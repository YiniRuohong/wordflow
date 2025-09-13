# WordFlow-Py 技术栈与实现步骤（前后端分离 & 批量导入)





> 目标：法语背诵应用（滚动学习法 + SRS），支持**批量导入“新大学法语”单词**，前后端分离，便于后续移动端。

> 开发协作：用 **Codex** 做“代码助理/补丁生成”，业务端用 **OpenAI Responses/Assistants API** 生成例句（可替换本地语料）。 



------





## **1) 技术栈选型**





**后端（Python 3.11+）**



- Web 框架：**FastAPI**（带 CORS、中间件、OpenAPI）
- ORM/数据库：SQLAlchemy + **SQLite**（生产可换 Postgres）。
- 全文检索：**SQLite FTS5**（词条与例句可模糊/前缀检索）。 
- 任务：FastAPI **BackgroundTasks**（导入解析异步落库；后续可换 Celery/Redis）。 
- 文件上传：FastAPI UploadFile（CSV/TSV/JSON）。 
- SRS：先 **SM-2**（简单稳定），后续插拔 **FSRS** 适配器。
- AI 例句：OpenAI **Responses/Assistants API**（服务侧），提示词控 CEFR 难度。 





**前端（Node 18+）**



- **Next.js 14**（或 Vite+React），**TanStack Query**（数据获取/缓存）、Tailwind/shadcn-ui（UI）。
- 上传页（批量导入）、学习页（今日队列）、复习页（打分 0/1/2/3）。





**开发协作（可选强化）**



- **Codex**：OpenAI 的开发者智能体，可在本地/云端读写你的仓库、生成补丁与测试。提供 CLI/IDE 扩展与云沙箱。把我文末的“任务卡片”直接贴给 Codex 即可。 





------





## **2) 目录结构（前后端分离）**



```
wordflow/
  api/                # FastAPI 后端
    app/
      core/           # 配置、常量
      models/         # ORM & FTS5 虚拟表
      schemas/        # Pydantic
      services/       # SRS/例句/导入
      routers/        # /words /cards /study /review /import
      main.py
    tests/
  web/                # Next.js 前端
  docker/             # compose 与部署脚本
```

## **3) 一次性初始化（可复制执行）** ✅ **已完成**



```
# 3.1 后端初始化
mkdir -p wordflow/api && cd wordflow/api
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn[standard] sqlalchemy aiosqlite pydantic-settings python-multipart pandas
pip install httpx tabulate  # 可选：拉取网络例句
pip install ruff mypy pytest

# 3.2 FastAPI 最小骨架
mkdir -p app/{core,models,schemas,services,routers}
touch app/{main.py,core/config.py} app/models/{__init__.py} app/schemas/{__init__.py} \
      app/services/{__init__.py} app/routers/{__init__.py}

# 3.3 前端初始化
cd .. && npx create-next-app@latest web --ts --eslint --tailwind --src-dir --app
cd web && npm i @tanstack/react-query axios
```

> 备注：批量导入走 UploadFile，解析放入 **BackgroundTasks**（返回 202/任务 id；前端用轮询/SSE 刷进度）。UploadFile 与 BackgroundTasks 组合时，务必**先把文件落盘**或读入内存后再投递，避免文件句柄关闭导致读取异常。 



------





## **4) 数据库与全文检索** ✅ **已完成**







### **4.1 SQLite + FTS5 启用**





- 方案 A：主表存结构化数据，另建 words_fts/examples_fts 虚拟表（contentless + triggers）。
- 方案 B：直接在 Postgres 用 pg_trgm/TSV（后期）。





> FTS5 提供高性能全文索引与前缀匹配，适合词条/例句检索。 





### **4.2 最小表（建议）**





- words(id, lemma, pos, gender, ipa, meaning_zh, lesson, cefr, tags)
- cards(id, word_id, template, hint, tags)
- srs_state(card_id PK, due, interval, ease, reps, lapses, algo) — 先 algo=sm2
- reviews(id, card_id, ts, grade, elapsed_ms)
- examples(id, card_id, text_fr, translation_zh, source, audio_uri, cefr)
- imports(id, filename, started_at, finished_at, status, total, succeeded, failed, message)





------





## **5) 后端 API 合约（v1）** ✅ **已完成**





> 所有 JSON 都是 **最终对接前端的数据契约**。落地时可直接生成 swagger。





### **5.1 批量导入**





- POST /api/v1/words/bulk —— multipart/form-data，字段：file（CSV/TSV/JSON）

  

  - 响应：202 { import_id }（后台解析入库，建 FTS5 索引）

  

- GET /api/v1/imports/{id} —— 轮询导入进度：{status, total, succeeded, failed, message}





**CSV/TSV 列模板**（与《新大学法语》配套，最少字段：lemma, meaning_zh, lesson）：

```
lemma,pos,gender,ipa,meaning_zh,lesson,cefr,tags
chemise,n,f,ʃəmiz,衬衫,L1,A1,衣物;名词
bonjour,interj,,bɔ̃ʒuʁ,你好,L1,A1,寒暄
...
```



### **5.2 检索与明细**





- GET /api/v1/words?q=chem* —— FTS5 前缀；tags/lesson/cefr 可选过滤
- GET /api/v1/words/{id} —— 词条详情（含示例）







### **5.3 学习/复习**





- GET /api/v1/study/next?limit=30 —— 今日队列（**滚动学习法：D-1/2/4/7** + SRS 到期）
- POST /api/v1/review —— {card_id, grade: 0|1|2|3} → 更新 SM-2 并记录复盘







### **5.4 AI 例句（可选）**





- POST /api/v1/examples/generate —— {lemma, cefr} → 返回 3–5 条例句（法→中）

  

  - 服务端调用 **OpenAI Responses/Assistants API** 生成+规约化（CEFR/句长/词频），失败回退到本地语料。 

  





------





## **6) 滚动学习法 + SRS（实现要点）** ✅ **已完成**





- 当日队列：Qd = due ∪ roll(D-1,2,4,7) ∪ new（按权重/上限裁剪）。
- SRS：**SM-2**（ease 初始化 2.5；grade: 0 again / 1 hard / 2 good / 3 easy）。
- 扩展：预留 algo=fsrs，后续引入 FSRS 适配器与参数优化（表结构不变）。





------





## **7) 前端（Next.js）落地步骤** ✅ **已完成**



```
# 7.1 新增环境变量
# web/.env.local
NEXT_PUBLIC_API_BASE=http://localhost:8000

# 7.2 安装上传与表格工具（可选）
cd web && npm i react-dropzone papaparse
```

**页面建议**



- /import：拖拽 CSV → 调 POST /words/bulk → 轮询 GET /imports/{id} → 显示结果 ✅ **已完成**
- /study：拉 GET /study/next → 逐卡展示/打分 ✅ **已完成**
- /words：搜索联想（FTS5 前缀）+ 过滤（lesson/tag/cefr） ✅ **已完成**

**已实现功能特点**：
- 字符级动画效果，文字浮现生动自然
- 响应式设计，适配不同屏幕尺寸  
- 支持明暗主题切换
- 采用Material Design设计语言，简洁大气
- 完整的导航系统和状态管理
- 统计页面：/stats，包含详细的学习数据分析和图表展示 ✅ **已完成**





------





## **8) 批量导入的关键细节（避免坑）**





1. **UploadFile + BackgroundTasks**：先 file = await f.read() 或 shutil.copyfileobj(f.file, tmp) 落到临时文件，再把路径递给后台任务；不要直接在后台任务里读 UploadFile 的文件句柄（响应后会被关闭）。 
2. 建完主表后再建 **FTS5 索引表**；或导入全部完成后统一 REBUILD。 
3. “新大学法语”每册章节不同，**用 lesson 列做分组**，便于滚动窗口按课次抽取。





------





## **9) 本地运行与联调（可复制）**



```
# 后端
cd wordflow/api && source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 前端
cd ../web && npm run dev -- --port 3000
```



------





## **10) Codex 协作（把下面这些“任务卡片”复制给 Codex）**





> Codex 是官方的开发者智能体，能读/改你的仓库、在本地或云沙箱里跑任务；也有 CLI/IDE 扩展可用。细节以官方文档为准。 



**任务卡 1｜后端导入流水线**

```
在 wordflow/api 下：
1) 创建 /app/routers/imports.py，暴露：
   - POST /api/v1/words/bulk (UploadFile) -> 返回 {import_id}
   - GET  /api/v1/imports/{id} -> 进度
2) services/importer.py：支持 CSV/TSV/JSON 自动识别，pandas 解析；字段映射到 words/cards；
3) 用 FastAPI BackgroundTasks 在返回 202 后异步解析入库；
4) 若 UploadFile 与后台任务组合，先把文件读入内存或落盘到 /tmp，避免句柄关闭；
5) 建立 words_fts / examples_fts（FTS5），为 lemma/meaning_zh 建索引；
6) 加 50 行以内的单元测试（pytest），覆盖 CSV 正常/缺列/空行场景。
```

**任务卡 2｜滚动学习法与 SRS**

```
1) services/scheduler.py：实现 roll(D-1,2,4,7)、due/new 合并，limit 裁剪；
2) services/srs/sm2.py：实现 SM-2 review(grade)；
3) routers/study.py：
   - GET /api/v1/study/next?limit=30
   - POST /api/v1/review {card_id, grade}
4) 添加 3 组回归测试，验证 grade=0/1/3 的间隔/ease 变化。
```

**任务卡 3｜AI 例句（Responses/Assistants）**

```
1) services/examples.py：generate_examples(lemma, cefr)；
2) 使用 OpenAI Responses 或 Assistants API（服务端），提示词控制 CEFR/句长/常用搭配；
3) 失败时回退到本地样例；结果落库 examples；
4) routers/examples.py：POST /api/v1/examples/generate。
```

**任务卡 4｜前端三页**

```
1) /import：拖拽上传 -> 轮询进度（succeeded/failed）；
2) /study：拉 /study/next，卡片式 UI，四键打分 0/1/2/3；
3) /words：输入即搜（前缀），lesson/cefr 过滤；TanStack Query 持久化缓存。
```



------





## **11) 安全与配置**



```
# api/.env
APP_ENV=dev
APP_ORIGINS=http://localhost:3000
OPENAI_API_KEY=sk-********************************

# web/.env.local
NEXT_PUBLIC_API_BASE=http://localhost:8000
```



- CORS：仅允许前端域名。
- 速率限制：Nginx/Traefik 层（后续再加）。
- OpenAI Key：仅**后端**持有；前端绝不直连。





------





## **12) 验收清单（最小可用）**





- 通过 /words/bulk 一次导入 ≥ 1000 条词条
- /study/next 能看到 **到期 + D-1/2/4/7 滚动**
- 打分后 /review 正常更新间隔
- /words?q=chem* 返回前缀命中（FTS5）
- 例句接口可用（联网时走 OpenAI，断网走本地）





------





## **13) 参考（关键点）**





- OpenAI Responses / Assistants API（服务端生成/管理对话与工具调用） 
- Codex（开发者智能体：CLI/IDE/云沙箱） 
- FastAPI BackgroundTasks / UploadFile（导入落库与异步处理） 
- SQLite **FTS5** 文档（全文检索/重建索引） 





------



如果你点头，这版就能直接起项目。接下来两步最划算：



1. 先把**你那套《新大学法语》**词表按上面的 CSV 模板导出；
2. 把“任务卡 1 & 2”贴给 Codex，让它把导入与学习骨架一次性补齐。