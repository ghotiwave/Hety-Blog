import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'

interface Digest {
  id: number; title: string; topic: string; created_at: string; slug?: string | null
  word_count: number; reading_minutes: number
}

export function Digest() {
  const [digests, setDigests] = useState<Digest[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')
  const [archives, setArchives] = useState<{ month: string; count: number }[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setLoading(true)
    api.get('/digests', {
      params: { page, page_size: 10, date: dateFilter || undefined },
    }).then((res) => {
      setDigests(res.data.items)
      setTotalPages(res.data.total_pages)
    }).finally(() => setLoading(false))
  }, [dateFilter, page])

  useEffect(() => {
    api.get('/digests/archives').then((res) => setArchives(res.data)).catch(() => {})
  }, [])

  if (loading) return <div className="text-center text-[var(--color-text-muted)] py-12">加载中...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl text-[var(--color-text)] mb-3 font-light tracking-wide">科技日报</h1>
      <p className="text-[15px] text-[var(--color-text-muted)] mb-10">AI 科技新闻，每日早八点更新。</p>

      {/* Archive navigation */}
      {archives.length > 0 && (
        <div className="flex items-center gap-2 mb-10 flex-wrap border-y border-[var(--color-border)] py-4">
          <span
            onClick={() => { setDateFilter(''); setPage(1) }}
            className={`px-4 py-2 text-sm cursor-pointer rounded-lg transition-colors ${!dateFilter ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`}
          >
            全部
          </span>
          {archives.map(({ month, count }) => {
            const [, m] = month.split('-')
            const label = `${m}月`
            return (
              <span
                key={month}
                onClick={() => { setDateFilter(month); setPage(1) }}
                className={`px-4 py-2 text-sm cursor-pointer rounded-lg transition-colors ${dateFilter === month ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`}
              >
                {label} <span className="opacity-60 text-xs">{count}</span>
              </span>
            )
          })}
        </div>
      )}

      {digests.length === 0 ? (
        <p className="text-[var(--color-text-muted)] text-center py-12">暂无日报。</p>
      ) : (
        <div className="space-y-3">
          {digests.map((d) => (
            <Link key={d.id} to={`/digest/${d.slug || d.id}`} className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 px-5 py-5 md:px-6 shadow-[0_8px_24px_rgba(0,0,0,0.035)] hover:bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40 hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <h3 className="text-lg leading-7 text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors font-semibold mb-2">{d.title}</h3>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-[var(--color-text-muted)] mt-3">
                    {d.topic && <span className="px-2 py-0.5 bg-[var(--color-surface)]">{d.topic}</span>}
                    <span>{d.word_count} 字</span>
                    <span>{d.reading_minutes} min read</span>
                  </div>
                </div>
                <span className="text-sm text-[var(--color-text-muted)] shrink-0">
                  {new Date(d.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </Link>
          ))}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 pt-6" aria-label="日报分页">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] disabled:opacity-35 disabled:cursor-not-allowed">
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, index) => (
                <button type="button" key={index} onClick={() => setPage(index + 1)}
                  className={`min-w-8 px-2.5 py-1.5 rounded-lg text-sm ${page === index + 1 ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'}`}>
                  {index + 1}
                </button>
              ))}
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] disabled:opacity-35 disabled:cursor-not-allowed">
                下一页
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  )
}
