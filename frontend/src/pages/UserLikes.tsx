import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'

interface LikedPost {
  post_id: number
  slug: string | null
  title: string
  created_at: string
}

export function UserLikes() {
  const [items, setItems] = useState<LikedPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/user/likes').then((res) => setItems(res.data.items)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-[var(--color-text-muted)] py-12 italic">加载中...</div>

  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-8">
      <header className="mb-7 border-b border-[var(--color-border)] pb-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-primary)]">ACCOUNT / LIKES</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)]">我的点赞</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">收藏你想再次阅读的内容。</p>
      </header>
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)] italic text-center py-12">暂无点赞记录</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          {items.map((item, i) => (
            <Link key={i} to={`/blog/${item.slug || item.post_id}`} className="group flex flex-col gap-1 border-b border-[var(--color-border)] px-4 py-4 transition-colors last:border-0 hover:bg-[var(--color-surface)] sm:flex-row sm:items-center sm:justify-between">
              <h3 className="min-w-0 text-[var(--color-text)] transition-colors group-hover:text-[var(--color-primary)]">{item.title}</h3>
              <span className="shrink-0 font-mono text-[10px] text-[var(--color-text-muted)]">{new Date(item.created_at).toLocaleDateString('zh-CN')}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
