import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'

interface Digest {
  id: number
  title: string
  topic: string
  created_at: string
}

export function Digest() {
  const [digests, setDigests] = useState<Digest[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/digests', {
      params: { page_size: 30, date: dateFilter || undefined },
    }).then((res) => setDigests(res.data.items)).finally(() => setLoading(false))
  }, [dateFilter])

  const archives = [...new Set(digests.map((d) => d.created_at.slice(0, 7)))].sort().reverse()

  if (loading) return <div className="text-center text-[var(--color-text-muted)] py-12">加载中...</div>

  return (
    <div>
      <h1 className="text-2xl text-[var(--color-text)] mb-2 font-light tracking-wide">AI 日报</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-8">每日 AI 行业动态，自动生成。</p>

      {/* Archive navigation */}
      {archives.length > 1 && (
        <div className="flex items-center gap-1 mb-8 flex-wrap">
          <span
            onClick={() => setDateFilter('')}
            className={`px-3 py-1.5 text-sm cursor-pointer rounded transition-colors ${!dateFilter ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
          >
            全部
          </span>
          {archives.map((ym) => {
            const [y, m] = ym.split('-')
            const label = `${m}月`
            return (
              <span
                key={ym}
                onClick={() => setDateFilter(ym)}
                className={`px-3 py-1.5 text-sm cursor-pointer rounded transition-colors ${dateFilter === ym ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
              >
                {label}
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
            <Link key={d.id} to={`/digest/${d.id}`} className="block py-3 border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface)]/50 transition-colors px-2 -mx-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors font-normal">{d.title}</h3>
                <span className="text-xs text-[var(--color-text-muted)] shrink-0 ml-4">
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
