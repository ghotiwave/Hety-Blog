import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import { PostCard } from './PostCard'
import { Input } from '@/components/ui/Input'

interface Post {
  id: number
  title: string
  summary: string | null
  cover_image: string | null
  tags: string | null
  slug: string | null
  created_at: string
  comment_count: number
  like_count: number
  view_count: number
  word_count: number
  reading_minutes: number
}

export function PostList({ postType }: { postType?: string }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const allTags = [...new Set(posts.flatMap((p) => (p.tags || '').split(',').map((t) => t.trim()).filter(Boolean)))]

  useEffect(() => {
    setLoading(true)
    api.get('/posts', {
      params: { page, q: q || undefined, tag: activeTag || undefined, type: postType || undefined },
    }).then((res) => {
      setPosts(res.data.items)
      setTotalPages(res.data.total_pages)
    }).finally(() => setLoading(false))
  }, [page, q, activeTag, postType])

  const toggleTag = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? '' : tag))
    setPage(1)
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[9rem_minmax(0,1fr)] gap-6 lg:gap-8">
      <aside className="lg:sticky lg:top-24 h-fit">
        <p className="text-[11px] font-mono tracking-[0.16em] text-[var(--color-text-muted)] mb-3">BROWSE</p>
        <Input
        placeholder="搜索文章"
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1) }}
        className="mb-4 bg-[var(--color-surface)]"
      />
      {allTags.length > 0 && (
        <div className="flex lg:flex-col flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-lg text-left text-xs cursor-pointer transition-colors ${
                activeTag === tag
                  ? 'bg-[var(--color-accent)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      </aside>

      <div>
      {loading ? (
        <div className="text-center text-[var(--color-text-muted)] py-12">正在加载文章…</div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 text-center text-[var(--color-text-muted)] py-12">没有找到匹配的文章。</div>
      ) : (
        <>
          {posts.map((p) => (
            <PostCard
              key={p.id}
              id={p.id}
              slug={p.slug}
              title={p.title}
              summary={p.summary}
              coverImage={p.cover_image}
              tags={p.tags}
              createdAt={p.created_at}
              commentCount={p.comment_count}
              likeCount={p.like_count}
              viewCount={p.view_count}
              wordCount={p.word_count}
              readingMinutes={p.reading_minutes}
              activeTag={activeTag}
              onTagClick={toggleTag}
            />
          ))}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-8" aria-label="博客分页">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] disabled:opacity-35 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`min-w-8 px-2.5 py-1.5 rounded-lg text-sm cursor-pointer ${
                    page === i + 1 ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] disabled:opacity-35 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </nav>
          )}
        </>
      )}
      </div>
    </div>
  )
}
