import { useState, useEffect } from 'react'
import api from '@/services/api'

interface AdminComment {
  id: number
  author_name: string
  post_title: string
  content: string
  created_at: string
}

export function AdminComments() {
  const [comments, setComments] = useState<AdminComment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchComments = () => {
    api.get('/admin/comments').then((res) => setComments(res.data.items)).finally(() => setLoading(false))
  }
  useEffect(() => { fetchComments() }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此评论？')) return
    await api.delete(`/admin/comments/${id}`)
    fetchComments()
  }

  if (loading) return <div className="text-center text-[var(--color-text-muted)] py-12">加载中...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">评论管理</h1>
      <div className="space-y-3">
        {comments.map((c) => (
          <article key={c.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 sm:p-5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-sm text-[var(--color-text)]">{c.author_name}</span>
                <span className="text-xs text-[var(--color-text-muted)]">评论于</span>
                <span className="text-sm text-[var(--color-primary)]">{c.post_title}</span>
              </div>
              <button onClick={() => handleDelete(c.id)} className="shrink-0 text-xs text-red-500 hover:text-red-600 cursor-pointer">
                删除
              </button>
            </div>
            <p className="break-words text-sm leading-7 text-[var(--color-text)]">{c.content}</p>
            <span className="mt-2 block font-mono text-[10px] text-[var(--color-text-muted)]">{new Date(c.created_at).toLocaleString('zh-CN')}</span>
          </article>
        ))}
      </div>
    </div>
  )
}
