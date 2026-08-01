import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'

interface Digest {
  id: number; title: string; topic: string; created_at: string; slug?: string | null
}

export function Digest() {
  const [digests, setDigests] = useState<Digest[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')
  const [archives, setArchives] = useState<{ month: string; count: number }[]>([])

  useEffect(() => {
    setLoading(true)
    api.get('/digests', {
      params: { page_size: 30, date: dateFilter || undefined },
    }).then((res) => setDigests(res.data.items)).finally(() => setLoading(false))
  }, [dateFilter])

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
            onClick={() => setDateFilter('')}
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
                onClick={() => setDateFilter(month)}
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
        <div>
          {digests.map((d) => (
            <Link key={d.id} to={`/digest/${d.slug || d.id}`} className="block py-5 md:py-6 border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface)]/70 transition-colors px-4 -mx-4 rounded-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-8 text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors font-normal">{d.title}</h3>
                <span className="text-sm text-[var(--color-text-muted)] shrink-0 ml-5">
                  {new Date(d.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
