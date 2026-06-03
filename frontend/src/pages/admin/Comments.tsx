import { useState, useEffect } from 'react'
import api from '@/services/api'

export function AdminComments() {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchComments = () => {
    api.get('/admin/comments').then((res) => setComments(res.data.items)).finally(() => setLoading(false))
  }
  useEffect(() => { fetchComments() }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this comment?')) return
    await api.delete(`/admin/comments/${id}`)
    fetchComments()
  }

  if (loading) return <div className="text-center text-gray-400 py-12">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Comments</h1>
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{c.author_name}</span>
                <span className="text-xs text-gray-400">on</span>
                <span className="text-sm text-blue-600">{c.post_title}</span>
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
                Delete
              </button>
            </div>
            <p className="text-sm text-gray-600">{c.content}</p>
            <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString('zh-CN')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
