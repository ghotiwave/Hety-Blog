import { PostList } from '@/components/blog/PostList'

export function Blog() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="pt-5 pb-8 mb-7 border-b border-[var(--color-border)]">
        <p className="text-[11px] font-mono tracking-[0.18em] text-[var(--color-primary)] mb-3">WRITING / ARCHIVE</p>
        <h1 className="text-3xl md:text-4xl text-[var(--color-text)] tracking-tight font-semibold">博客 / 思考与记录</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-3">关于技术、AI 与生活的持续记录。</p>
      </div>
      <PostList postType="blog" />
    </div>
  )
}
