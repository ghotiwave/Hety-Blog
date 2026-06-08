import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrexRunner } from '@/components/game/TrexRunner'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { Button } from '@/components/ui/Button'

export function Game() {
  const { user } = useAuth()
  const [top5, setTop5] = useState<any[]>([])

  useEffect(() => {
    api.get('/scores/leaderboard').then((res) => setTop5(res.data.leaderboard.slice(0, 5)))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">小恐龙快跑</h1>
        {!user && (
          <Link to="/login">
            <Button size="sm">登录保存成绩</Button>
          </Link>
        )}
      </div>

      <p className="text-sm text-[var(--color-text-muted)] mb-2">空格键跳跃，方向键下蹲。</p>

      <div className="mb-8">
        <TrexRunner />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">排行榜 Top 5</h2>
        <Link to="/leaderboard">
          <Button variant="ghost" size="sm">查看全部</Button>
        </Link>
      </div>

      {top5.length === 0 ? (
        <p className="text-[var(--color-text-muted)] text-sm">暂无成绩，快来挑战吧！</p>
      ) : (
        <div className="space-y-2">
          {top5.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] px-4 py-2">
              <span className={`font-bold text-sm w-6 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-[var(--color-text-muted)]'}`}>
                #{i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-[var(--color-text)]">{s.username}</span>
              <span className="text-sm font-mono font-bold text-[var(--color-text)]">{s.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
