# CLAUDE.md

## 项目概述

Hety-Blog — 个人博客全栈模版。React + Vite + TypeScript + Tailwind CSS 前端，FastAPI + SQLAlchemy + SQLite 后端，Docker Compose 部署。

## 目录结构

```
blog/
├── backend/
│   ├── app/
│   │   ├── models/      # SQLAlchemy 模型
│   │   ├── routers/     # FastAPI 路由（公开 + 管理）
│   │   ├── schemas/     # Pydantic 请求/响应
│   │   ├── services/    # AI 日报、邮件服务
│   │   ├── config.py    # pydantic-settings 配置
│   │   ├── database.py  # 引擎、Session、init_db()
│   │   └── main.py      # FastAPI 入口、APScheduler
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/  # blog/, admin/, layout/, ui/, game/
│   │   ├── pages/       # 页面组件（admin/ 子目录）
│   │   ├── contexts/    # AuthContext, ThemeContext
│   │   ├── services/    # api.ts（axios 实例）
│   │   └── config.ts    # 站点名称、功能开关
│   ├── public/          # 静态资源（表情包、favicon）
│   ├── scripts/         # 构建辅助脚本
│   ├── nginx.conf       # Nginx 配置
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/   # CI/CD
```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 4 |
| 后端 | FastAPI + SQLAlchemy 2.0 + SQLite |
| 认证 | JWT（python-jose + bcrypt） |
| AI | 兼容 OpenAI 接口（DeepSeek 默认） |
| 定时任务 | APScheduler（北京时间 8:00 生成日报） |
| 邮件 | Resend（验证码注册） |
| 部署 | Docker Compose（前端 Nginx + 后端 Uvicorn）；HTTPS 由上游 Caddy 网关统一管理 |

## 本地开发

### 后端

```bash
cd backend
# 需要 conda 环境 blog（含所有依赖）
conda run -n blog python -m uvicorn app.main:app --reload --port 9000
```

API 文档：`http://localhost:9000/docs`
前端 dev server 通过 `vite.config.ts` proxy 转发 `/api` 到 9000。

### 前端

```bash
cd frontend
npm run dev   # 先执行 predev 生成 logo-sm.png
# http://localhost:5173
```

### 笔记站

```bash
cd ../notes
node quartz/bootstrap-cli.mjs build
cd public && python -m http.server 8080
```

## 工程规范

### 文件命名
- 组件文件：PascalCase（`PostCard.tsx`、`CommentSection.tsx`）
- 后端路由：snake_case（`admin_posts.py`、`user_actions.py`）
- 工具/配置：camelCase（`config.ts`、`api.ts`）

### 后端路由结构
- 公开 API：`GET /api/posts`、`POST /api/auth/login` 等
- 管理 API：`GET /api/admin/posts`、`PUT /api/admin/profile` 等
- 路由文件在 `backend/app/routers/` 下，`main.py` 中注册

### 前端组件结构
- 页面组件放 `pages/`，子页面放子目录
- 通用 UI 组件放 `components/ui/`
- 布局组件放 `components/layout/`
- 博客相关组件放 `components/blog/`
- 管理端组件放 `components/admin/`

### 环境变量
`.env` 放在项目根目录（docker-compose 读取），backend 子目录的 `.env` 用于本地开发。
```
SECRET_KEY=随机字符串         # 必填
ADMIN_USERNAME=admin          # 管理员用户名
ADMIN_PASSWORD=你的密码        # 必填
AI_API_KEY=sk-xxx             # AI 日报 API key
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
RESEND_API_KEY=re_xxx         # 邮件验证
SITE_DOMAIN=gianniiss.top
SITE_URL=https://gianniiss.top
```

### 颜色/主题
使用 CSS 自定义属性，禁止硬编码颜色：
```css
color: var(--color-text)         /* 正文 */
background: var(--color-bg)      /* 页面背景 */
background: var(--color-surface) /* 卡片背景 */
border: var(--color-border)      /* 边框 */
color: var(--color-primary)      /* 主题色/链接 */
color: var(--color-text-muted)   /* 次要文字 */
```
暗色模式在 `.dark` 块定义对应变量。新增 UI 务必用变量。

### API 调用
前端统一用 `@/services/api`（axios 实例），自动附加 JWT token。不要用裸 fetch。
```ts
const res = await api.get('/posts?page=1')
const res = await api.post('/auth/login', { username, password })
```

### 导入别名
前端 `@/` 映射到 `src/`。后端所有导入相对于 `app/` 或 `backend/`。

## 重要陷阱

### Docker 构建
- **永远不要 `docker compose down -v`**：会删除数据库 volume。用 `docker compose up -d --build` 滚动更新
- **不要 `--no-cache` 构建**：会导致 pip install uv 失败（需要镜像，见 Dockerfile）
- **前端 Dockerfile** 用的 `npm config set registry https://registry.npmmirror.com` 加速
- **后端 Dockerfile** 用的清华 PyPI 镜像

### GitHub 被墙
- 服务器（106.54.211.108）在中国，无法访问 GitHub
- CI/CD 用 rsync 从 Actions runner 推代码，不靠服务器 pull
- 手动修复服务器时用 SFTP（paramiko）上传
- 本机 git 配了 `http.proxy=http://127.0.0.1:7890`，代理没开时 push 用 `git -c http.proxy= -c https.proxy= push`

### 数据库
- SQLite 存在 Docker volume `blog_data` 中
- `init_db()` 只在首次启动且 admin 不存在时创建管理员
- 密码为空或 `your-admin-password` 时会报错（防止空密码部署）
- 每天凌晨 3 点自动备份到 `~/blog-backups/`

### AI 日报
- DeepSeek V4 模型默认开启 thinking，必须用 `extra_body={"thinking": {"type": "disabled"}}` 关闭
- `.env` 中 `AI_MODEL` 用户可改为任何 OpenAI 兼容模型
- 日报生成约需 1-2 分钟，nginx `proxy_read_timeout` 设为 180s
- 同一天多次生成的 slug 自动加 `-2`、`-3` 后缀
- **`news_fetcher.py` 只用 `timezone.utc`，不要引入 `BEIJING_TZ`**——该文件有两处 `datetime.now()` 且被 `except Exception: return []` 包裹，未导入的变量会导致新闻源静默失败，日报内容大幅缩水

### 笔记站
- 笔记站已独立为 `notes.gianniiss.top`（Quartz，由 **Caddy 网关**直接服务静态产物），**不再挂在博客下**。
- Quartz 生成 clean URL（无 `.html`），由网关 `try_files {path} {path}.html {path}/index.html` 处理。
- SPA 模式在子路径下导航有 bug，已关闭（`enableSPA: false`）

### 时区
- 服务器/容器使用 UTC
- APScheduler 已配置 `timezone="Asia/Shanghai"`（北京 8:00 生成日报）
- 数据库中时间戳仍为 UTC，**显示时间比北京时间晚 8 小时**（未修复）

### 剪贴板
- `navigator.clipboard` 仅 HTTPS 可用
- 所有复制功能需有 HTTP 降级方案（`document.execCommand('copy')`）

## 部署架构

博客是 MySite 多站架构中的**一个子站**，跑在 `blog.gianniiss.top`。整站边缘由独立的 **Caddy 网关**（`~/gateway`，另一个项目）统一终止 HTTPS、按子域分发——博客本身**不再终止 TLS、也不再服务 notes**。

```
浏览器 ──https──> Caddy 网关 (:443，自动证书)
                     │  blog.gianniiss.top
                     ▼
        blog 前端容器（宿主机 172.17.0.1:8080，容器内 nginx listen 80）
                     ├─ /          → 前端静态文件（SPA）
                     ├─ /api/*     → backend:8000 (FastAPI)
                     └─ /uploads/* → backend:8000
```

- 前端容器只发布到宿主机 `172.17.0.1:8080`，**不对公网**；公网只走网关的 443。
- 证书由 **Caddy 自动管理**（HTTP-01），博客侧已无任何 certbot / SSL 配置（旧的 `/etc/letsencrypt` + `certbot renew` 已弃用）。
- 改服务器 `.env`（如 API Key）需 SSH 手动编辑 `~/blog/.env`，然后 `docker compose up -d backend`。CI 通过 `--exclude='.env'` 保护服务器端 .env。
- 数据库每天凌晨 3 点自动备份到 `~/blog-backups/`。
- **完整多站架构（网关 / 主页 / 笔记 / 工具、域名拓扑、密钥位置）见 `D:\MySite\PROJECT_MEMORY.md`**；运维细节见 `D:\MySite\Deploy guide.md`（均不在本仓库）。

## CI/CD

### 博客站（Hety-Blog）
`push main` → rsync 代码到服务器 `~/blog/` → `docker compose up -d --build`（TLS 归 Caddy 网关，CI 不再处理 SSL/域名/notes）

### 笔记站（Hety-Wiki）
`push main` → npm ci → Quartz 构建 → rsync `public/` 到服务器

需要 GitHub Secrets：`SERVER_HOST`、`SERVER_USER`、`SERVER_SSH_KEY`

## 常用命令

```bash
# 生成 AI 日报（本地）
curl -s -X POST http://localhost:9000/api/admin/digests/generate \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:9000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"Hety","password":"xxx"}' | jq -r '.access_token')"
```
