import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

interface Comment {
  id: number
  author_name: string
  avatar_url: string | null
  content: string
  created_at: string
}

export function CommentSection({ postId }: { postId: number }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuth()

  const fetchComments = () => {
    api.get(`/posts/${postId}/comments`).then((res) => setComments(res.data))
  }

  useEffect(() => { fetchComments() }, [postId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/posts/${postId}/comments`, { content: content.trim() })
      setContent('')
      fetchComments()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-12">
      <h2 className="text-lg text-stone-700 mb-6" style={{ fontFamily: 'Georgia, serif' }}>
        评论 ({comments.length})
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="space-y-3 mb-8">
          <Textarea
            placeholder="写下评论..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? '发送中...' : '发表评论'}
          </Button>
        </form>
      ) : (
        <div className="mb-8 py-4 px-4 bg-stone-50 rounded-lg border border-stone-200 text-center">
          <p className="text-stone-400 italic text-sm">
            <Link to="/login" className="text-[#8b7355] hover:underline">登录</Link> 后发表评论。
          </p>
        </div>
      )}

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="py-3 border-b border-amber-100">
            <div className="flex items-center gap-2 mb-1">
              {c.avatar_url ? (
                <img src={c.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-[var(--color-border)]" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                  {c.author_name[0]}
                </div>
              )}
              <span className="font-medium text-sm text-stone-700">{c.author_name}</span>
              <span className="text-xs text-stone-300">
                {new Date(c.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            <div className="text-sm text-stone-500 prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {c.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
