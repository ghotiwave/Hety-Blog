export function About() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl text-[var(--color-text)] mb-8 font-light tracking-wide">关于本站</h1>

      <div className="space-y-8 text-sm text-[var(--color-text)] leading-loose">
        <section>
          <h2 className="text-xs text-[var(--color-text-muted)] tracking-[0.2em] mb-3">这是什么网站</h2>
          <p>
            {siteConfig.name}，一个集博客、笔记和 AI 日报于一体的小角落。
            这里记录了我的技术学习、生活随想，也尝试用 AI 整理每日值得关注的信息。
          </p>
        </section>

        <section>
          <h2 className="text-xs text-[var(--color-text-muted)] tracking-[0.2em] mb-3">技术栈</h2>
          <div className="grid grid-cols-2 gap-3 text-[var(--color-text-muted)]">
            <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)]/50 rounded-lg p-4">
              <div className="font-semibold text-[var(--color-text)] mb-1">前端</div>
              <p className="text-xs">React + Vite + TypeScript<br />Tailwind CSS + shadcn/ui</p>
            </div>
            <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)]/50 rounded-lg p-4">
              <div className="font-semibold text-[var(--color-text)] mb-1">后端</div>
              <p className="text-xs">FastAPI + SQLAlchemy<br />SQLite + JWT 认证</p>
            </div>
            <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)]/50 rounded-lg p-4">
              <div className="font-semibold text-[var(--color-text)] mb-1">笔记站</div>
              <p className="text-xs">Quartz v4 + Obsidian<br />Markdown + Wikilink</p>
            </div>
            <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)]/50 rounded-lg p-4">
              <div className="font-semibold text-[var(--color-text)] mb-1">部署</div>
              <p className="text-xs">Docker Compose<br />Nginx + Uvicorn</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs text-[var(--color-text-muted)] tracking-[0.2em] mb-3">功能</h2>
          <ul className="space-y-2 text-[var(--color-text-muted)] list-disc list-inside">
            <li>博客文章（Markdown 编辑 + 评论 + 点赞）</li>
            <li>AI 技术日报（每日自动生成）</li>
            <li>{siteConfig.wikiName} 笔记站（Obsidian 管理）</li>
            <li>小恐龙快跑（Chrome Dino 游戏）</li>
            <li>明暗双主题切换</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs text-[var(--color-text-muted)] tracking-[0.2em] mb-3">联系</h2>
          <p className="text-[var(--color-text-muted)]">
            想了解更多？回首页点击个人信息图标查看我的社交链接。
          </p>
        </section>
      </div>
    </div>
  )
}
