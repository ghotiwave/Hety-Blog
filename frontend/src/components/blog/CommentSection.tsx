import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

interface Comment {
  id: number
  author_name: string
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
        Comments ({comments.length})
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="space-y-3 mb-8">
          <Textarea
            placeholder="Write a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </form>
      ) : (
        <div className="mb-8 py-4 px-4 bg-stone-50 rounded-lg border border-stone-200 text-center">
          <p className="text-stone-400 italic text-sm">
            <Link to="/login" className="text-amber-700 hover:underline">Login</Link> to post a comment.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="py-3 border-b border-amber-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-stone-700">{c.author_name}</span>
              <span className="text-xs text-stone-300">
                {new Date(c.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            <p className="text-sm text-stone-500">{c.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
