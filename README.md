# Hety-Blog

我在 vibe coding 自己的个人博客时整理出的一个开箱即用的全栈个人博客模版，支持 Markdown 写作、评论系统、AI 日报、暗色模式、笔记站集成。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React + Vite + TypeScript + Tailwind CSS |
| 后端 | FastAPI + SQLAlchemy + SQLite |
| 认证 | JWT（bcrypt 密码哈希） |
| AI | DeepSeek API（可选，不填则跳过日报） |
| 部署 | Docker Compose（Nginx 反代 + Uvicorn） |
| 笔记站 | Quartz v4（可选，独立仓库） |

## 功能

- 博客文章 — Markdown 编辑器 + 实时预览 + 图片上传 + 表情包
- 评论区 — 二层嵌套回复 + 点赞 + 表情 + 管理员标识
- 用户系统 — 注册/登录、头像上传（自动压缩）、个性签名
- AI 日报 — 每天 8:00 自动抓取新闻 + DeepSeek 总结生成
- 明暗双主题 — 一键切换，CSS 变量全覆盖
- 小恐龙快跑 — npm 包 `t-rex-runner`，分数排行榜
- 笔记站 — Obsidian 写作 + Quartz 发布（独立部署到 `/notes`）

---

## Docker 部署（推荐，只需 3 步）

适用于本地开发或服务器部署。前提：已安装 Docker。

```bash
# 1. 克隆仓库
git clone https://github.com/ghotiwave/Hety-Blog.git
cd Hety-Blog

# 2. 创建环境变量文件（必须放在项目根目录，docker compose 只读这里的 .env）
cp .env.example .env
# 编辑 .env，至少填两个必填项：
#   SECRET_KEY=随机字符串
#   ADMIN_PASSWORD=你的管理员密码
# （DEEPSEEK_API_KEY 可留空）

# 3. 启动
docker compose up -d --build
```

访问 `http://localhost`（本地）或 `http://你的服务器IP`（服务器）。

首次启动会自动创建 SQLite 数据库和管理员账号。登录后台 `http://localhost/admin/dashboard` 完善个人信息和关于页面。

> **笔记站是可选的**。不需要的话不用管，`/notes` 路径会返回 404，不影响博客正常运行。

---

## 本地开发（不依赖 Docker）

适合需要频繁改代码的场景。

### 环境准备

- Python 3.12+（推荐用 conda 管理环境）
- Node.js 20+
- 可选：conda 环境已配好 `Pillow`（头像压缩）和 `bcrypt`（密码哈希）

### 启动后端

```bash
cd backend
cp ../.env.example .env  # 编辑 .env 填 SECRET_KEY 和 ADMIN_PASSWORD
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

API 文档：http://localhost:8000/docs

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端：http://localhost:5173（自动代理 `/api` 到 8000 端口）

### 启动笔记站（可选）

笔记站是独立仓库，需单独克隆和构建：

```bash
git clone https://github.com/ghotiwave/Hety-Wiki.git ../notes
cd ../notes
npm install
npx quartz build
# 用任意静态服务器托管 public/ 目录
cd public && python -m http.server 8080
```

---

## 个性化

### 方式一：不用改代码，后台直接改

登录 `http://localhost/admin/dashboard`（默认账号 `.env` 里设的管理员），以下内容可在网页上编辑，立即生效：

| 内容 | 位置 | 支持格式 |
|---|---|---|
| 个人信息（姓名、简介、兴趣） | 管理后台 → 个人资料 | Markdown |
| 头像 | 管理后台 → 个人资料 | 上传自动压缩 |
| 社交链接（GitHub、X、QQ、抖音、邮箱） | 管理后台 → 个人资料 | 链接/号码 |
| 关于页面 | 管理后台 → 个人资料 → 关于页面编辑器 | Markdown + 图片 + 表情 |
| 博客文章 | 管理后台 → 文章管理 | Markdown + 图片 + 表情 |

### 方式二：需手动改文件，改完重新构建

以下内容不在数据库中，需要编辑源码后 `docker compose up -d --build` 重新构建。

#### 网站名称和标语

编辑 `frontend/src/config.ts`：

```ts
export const siteConfig = {
  name: '你的网站名',        // 首页大标题
  shortName: '简写',         // 导航栏和页脚显示的短名
  description: '你的标语',    // 首页副标题
  wikiName: '你的Wiki名',    // 笔记站名称（没有就不管）
}
```

#### 网站 Logo

替换 `frontend/src/assets/logo.png`。建议正方形 PNG，尺寸不限（会自动缩放）。同时也作为浏览器标签页图标（favicon）。

#### 环境变量

`.env`（项目根目录）包含后台运行所需的配置：

| 变量 | 必填 | 说明 |
|---|---|---|
| `SECRET_KEY` | 是 | JWT 签名密钥，随便一串乱码即可 |
| `ADMIN_USERNAME` | 否 | 初始管理员用户名，默认 `admin` |
| `ADMIN_PASSWORD` | 是 | 初始管理员密码，首次启动后生效 |
| `SITE_NAME` | 否 | 网站名，用于验证邮件等场景 |
| `SITE_DOMAIN` | 否 | 域名，用于邮件发件人地址 |
| `DEEPSEEK_API_KEY` | 否 | DeepSeek API 密钥，不填则不生成 AI 日报 |
| `DEEPSEEK_BASE_URL` | 否 | API 地址，默认 `https://api.deepseek.com` |
| `RESEND_API_KEY` | 否 | 邮件服务，不填则注册后直接登录 |

修改 `.env` 后需重启容器：`docker compose down && docker compose up -d --build`

#### 配色方案

编辑 `frontend/src/index.css`，搜索 `@theme` 块：

```css
@theme {
  --color-primary: #8b7355;       /* 主题色（链接、按钮） */
  --color-bg: #fafaf7;            /* 页面背景 */
  --color-surface: #f5f4f0;       /* 卡片背景 */
  --color-text: #3a3a38;          /* 正文颜色 */
  --color-text-muted: #9a9996;    /* 次要文字 */
  --color-border: #e8e6e0;        /* 边框 */
}
```

暗色模式在 `.dark` 块里有对应的变量，需要同步修改。六个变量改完，整个网站的配色就全换了。

---

## 目录结构

```
├── backend/
│   ├── app/
│   │   ├── models/      # 数据库模型
│   │   ├── routers/     # API 路由
│   │   ├── schemas/     # Pydantic 校验
│   │   └── services/    # AI 日报生成
│   ├── data/            # SQLite 数据库（gitignore）
│   └── .env             # 环境变量（gitignore）
├── frontend/
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── pages/       # 页面
│   │   └── config.ts    # 站点名称配置
│   └── public/          # 静态资源（表情包、favicon）
├── docker-compose.yml
└── .github/workflows/   # CI/CD（push 自动部署到服务器）
```

---

## CI/CD 自动部署

仓库已配置 GitHub Actions。push 到 main 分支 → 自动 SSH 到服务器 → `git pull` → `docker compose up -d --build`。

使用前需在 GitHub 仓库 Settings → Secrets 中添加：
- `SERVER_HOST` — 服务器 IP
- `SERVER_USER` — SSH 用户名
- `SERVER_SSH_KEY` — SSH 私钥

---

## License

MIT — 自由使用、修改、分发。
