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
      <h2 className="text-xl text-[var(--color-text)] mb-6 font-light tracking-wide">
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
          <div key={c.id} className="py-5 border-b border-amber-100">
            <div className="flex items-start gap-4">
              {c.avatar_url ? (
                <img src={c.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover border border-[var(--color-border)] shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-base text-[var(--color-text-muted)] shrink-0">
                  {c.author_name[0]}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="font-medium text-base text-[var(--color-text)]">{c.author_name}</span>
                  <span className="text-sm text-[var(--color-text-muted)]">{new Date(c.created_at).toLocaleString('zh-CN')}</span>
                </div>
              <div className="text-base text-[var(--color-text)] prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {c.content}
                </ReactMarkdown>
              </div>
            </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
