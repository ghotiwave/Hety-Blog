import { useState, useEffect } from 'react'
import api from '@/services/api'

interface Score {
  id: number
  username: string
  score: number
  played_at: string
}

export function Leaderboard() {
  const [scores, setScores] = useState<Score[]>([])

  useEffect(() => {
    api.get('/scores/leaderboard').then((res) => setScores(res.data.leaderboard))
  }, [])

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-8">小恐龙快跑排行榜</h1>

      {scores.length === 0 ? (
        <p className="text-[var(--color-text-muted)] text-center py-12">暂无成绩</p>
      ) : (
        <div className="space-y-2">
          {scores.map((s, i) => (
            <div key={s.id} className="flex items-center gap-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] px-5 py-3">
              <span className={`font-bold w-8 ${i === 0 ? 'text-yellow-500 text-lg' : i === 1 ? 'text-gray-400 text-lg' : i === 2 ? 'text-amber-600 text-lg' : 'text-[var(--color-text-muted)]'}`}>
                #{i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-[var(--color-text)]">{s.username}</span>
              <span className="text-sm font-mono font-bold text-[var(--color-text)]">{s.score.toLocaleString()}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{new Date(s.played_at).toLocaleDateString('zh-CN')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
