# Hety-Blog 模版

我在 vibe coding 自己的个人博客时整理出的一个开箱即用的全栈个人博客模版，支持 Markdown 写作、评论系统、AI 日报、暗色模式、笔记站集成。

## 技术栈

| 层面 | 技术 |
|---|---|
| 前端 | React + Vite + TypeScript + Tailwind CSS |
| 后端 | FastAPI + SQLAlchemy + SQLite |
| 认证 | JWT (python-jose + bcrypt) |
| AI | DeepSeek API（可选） |
| 部署 | Docker Compose (Nginx + Uvicorn) |
| 笔记站 | Quartz v4（可选，独立部署） |

## 功能

- 博客文章（Markdown 编辑器 + 实时预览 + 图片上传）
- 评论系统（B 站风格二层评论 + 点赞 + 表情包）
- 用户注册/登录（邮箱验证、头像、个性签名）
- AI 技术日报（DeepSeek 每日自动生成）
- 明暗双主题
- 小恐龙快跑游戏
- 笔记站（Obsidian + Quartz）
- Docker 一键部署

## 快速开始

### 1. Clone 并配置

```bash
git clone https://github.com/ghotiwave/Hety-Blog.git
cd MyBlog
cp .env.example backend/.env
```

编辑 `backend/.env`：
```env
SECRET_KEY=生成一个随机字符串
ADMIN_PASSWORD=你的管理员密码
SITE_NAME=我的个人主页
DEEPSEEK_API_KEY=你的DeepSeek API key（可选，不填则不生成AI日报）
```

### 2. 个性化

编辑 `frontend/src/config.ts`：
```ts
export const siteConfig = {
  name: '我的个人主页',
  shortName: 'Me',
  description: '技术、思考与生活。',
  wikiName: 'My-Wiki',
}
```

替换 `frontend/src/assets/logo.png` 为你的 logo。

### 3. 本地运行

```bash
# 后端
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# 前端（新终端）
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

### 4. Docker 部署

```bash
docker compose up -d --build
```

部署后在管理后台（/admin/dashboard）完善个人信息。

## 目录结构

```
├── backend/           # FastAPI 后端
│   ├── app/
│   │   ├── models/    # 数据库模型
│   │   ├── routers/   # API 路由
│   │   ├── schemas/   # Pydantic 模型
│   │   └── services/  # 业务逻辑（AI日报等）
│   └── data/          # SQLite 数据库（gitignore）
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/ # UI 组件
│   │   ├── pages/      # 页面
│   │   └── config.ts   # 站点配置
│   └── public/         # 静态资源（表情包等）
├── docker-compose.yml  # Docker 编排
└── .github/workflows/  # CI/CD 自动部署
```

## 笔记站（可选）

笔记站是一个独立的 Quartz 项目，使用 Obsidian 管理内容。

仓库：https://github.com/ghotiwave/Hety-Wiki

## License

MIT — 自由使用、修改、分发。
