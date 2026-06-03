import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'

export function UserHistory() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/user/history').then((res) => setItems(res.data.items)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-stone-300 py-12 italic">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl text-stone-800 mb-8" style={{ fontFamily: 'Georgia, serif' }}>Reading History</h1>
      {items.length === 0 ? (
        <p className="text-stone-300 italic text-center py-12">No history yet.</p>
      ) : (
        <div>
          {items.map((item, i) => (
            <Link key={i} to={`/blog/${item.post_id}`} className="block group py-3 border-b border-amber-200/40 hover:bg-amber-50/30 transition-colors px-2 -mx-2 rounded">
              <h3 className="text-stone-700 group-hover:text-amber-700 transition-colors">{item.title}</h3>
              <span className="text-xs text-stone-300 italic">{new Date(item.visited_at).toLocaleString('zh-CN')}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
