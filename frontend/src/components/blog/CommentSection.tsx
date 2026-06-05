import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { EmojiPicker } from '@/components/blog/EmojiPicker'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'

interface Comment {
  id: number
  author_name: string
  avatar_url: string | null
  content: string
  reply_to_name: string | null
  like_count: number
  user_liked: boolean
  reply_count: number
  created_at: string
  replies?: Comment[]
  parent_id?: number | null
}

export function CommentSection({ postId }: { postId: number }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [sort, setSort] = useState<'time' | 'hot'>('time')
  const { user } = useAuth()
  const [replyTarget, setReplyTarget] = useState<{ id: number; name: string } | null>(null)

  const fetchComments = useCallback(() => {
    api.get(`/posts/${postId}/comments`, { params: { sort } }).then((res) => setComments(res.data.items))
  }, [postId, sort])

  useEffect(() => { fetchComments() }, [fetchComments])

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl text-[var(--color-text)] font-light tracking-wide">
          评论 ({comments.length})
        </h2>
        <div className="flex gap-2 text-sm">
          {(['time', 'hot'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1 rounded cursor-pointer transition-colors ${sort === s ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              {s === 'time' ? '最新' : '最热'}
            </button>
          ))}
        </div>
      </div>

      {user ? (
        <CommentForm
          postId={postId}
          placeholder="发表评论..."
          onSubmit={fetchComments}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
        />
      ) : (
        <div className="mb-6 py-4 px-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] text-center">
          <p className="text-[var(--color-text-muted)] text-sm">
            <Link to="/login" className="text-[var(--color-primary)] hover:underline">登录</Link> 后发表评论
          </p>
        </div>
      )}

      <div className="space-y-0">
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            postId={postId}
            onReply={(id, name) => setReplyTarget({ id, name })}
            onRefresh={fetchComments}
          />
        ))}
      </div>
    </div>
  )
}

function CommentItem({ comment, postId, onReply, onRefresh }: {
  comment: Comment
  postId: number
  onReply: (id: number, name: string) => void
  onRefresh: () => void
}) {
  const [showReplies, setShowReplies] = useState(false)
  const [allReplies, setAllReplies] = useState<Comment[]>([])
  const { user } = useAuth()

  const handleLike = async () => {
    if (!user) return
    await api.post(`/posts/${postId}/comments/${comment.id}/like`)
    onRefresh()
  }

  const loadReplies = () => {
    if (!comment.reply_count) return
    setShowReplies(!showReplies)
    if (!showReplies) {
      api.get(`/posts/${postId}/comments/${comment.id}/replies`)
        .then((res) => setAllReplies(res.data.items))
    }
  }

  return (
    <div className="border-b border-[var(--color-border)]/60 py-4">
      <div className="flex items-start gap-4">
        {comment.avatar_url ? (
          <img src={comment.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-sm text-[var(--color-text-muted)] shrink-0">
            {comment.author_name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-[var(--color-text)]">{comment.author_name}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{new Date(comment.created_at).toLocaleString('zh-CN')}</span>
          </div>
          <div className="text-sm text-[var(--color-text)] prose max-w-none mb-2">
            {comment.reply_to_name && (
              <span className="text-[var(--color-primary)] mr-1">回复 @{comment.reply_to_name}:</span>
            )}
            <MarkdownRenderer allowedElements={['strong','a','code','em','p','img','ul','ol','li','blockquote','pre','h3','h4']}>
              {comment.content}
            </MarkdownRenderer>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <button onClick={handleLike} className={`${comment.user_liked ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} hover:text-[var(--color-primary)] cursor-pointer transition-colors`}>
              {comment.user_liked ? '❤' : '🤍'} {comment.like_count}
            </button>
            <button onClick={() => onReply(comment.id, comment.author_name)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer transition-colors">
              回复
            </button>
            {comment.reply_count > 0 && (
              <button onClick={loadReplies} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer transition-colors">
                {showReplies ? '收起' : `共 ${comment.reply_count} 条回复`}
              </button>
            )}
          </div>

          {/* Replies */}
          {showReplies && allReplies.length > 0 && (
            <div className="mt-4 ml-6 pl-5 border-l-2 border-[var(--color-border)]/60 space-y-4">
              {allReplies.map((r) => (
                <div key={r.id} className="flex items-start gap-3">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xs text-[var(--color-text-muted)] shrink-0">
                      {r.author_name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-[var(--color-text)]">{r.author_name}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{new Date(r.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="text-sm text-[var(--color-text)]">
                      {r.reply_to_name && <span className="text-[var(--color-primary)] mr-1">@ {r.reply_to_name}</span>}
                      <MarkdownRenderer>
                        {r.content}
                      </MarkdownRenderer>
                    </div>
                    <button onClick={() => onReply(r.id, r.author_name)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer mt-1">回复</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentForm({ postId, placeholder, onSubmit, replyTarget, onCancelReply }: {
  postId: number
  placeholder: string
  onSubmit: () => void
  replyTarget: { id: number; name: string } | null
  onCancelReply: () => void
}) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [preview, setPreview] = useState(false)
  const textareaId = `comment-textarea-${postId}`

  const insertAtCursor = (text: string) => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement | null
    if (el) {
      const start = el.selectionStart ?? content.length
      const end = el.selectionEnd ?? content.length
      const next = content.slice(0, start) + text + content.slice(end)
      setContent(next)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start + text.length, start + text.length)
      })
    } else {
      setContent((prev) => prev + text)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json()
      if (data.url) insertAtCursor(`![](${data.url})`)
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/posts/${postId}/comments`, {
        content: content.trim(),
        parent_id: replyTarget?.id || null,
        reply_to_user_id: replyTarget?.id || null,
      })
      setContent('')
      onCancelReply()
      onSubmit()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-3">
      {replyTarget && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span>回复 @{replyTarget.name}</span>
          <button type="button" onClick={onCancelReply} className="text-[var(--color-primary)] cursor-pointer">取消</button>
        </div>
      )}
      {preview ? (
        <div className="min-h-[100px] p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/30 text-sm prose max-w-none prose-a:text-[var(--color-primary)]">
          {content ? (
            <MarkdownRenderer allowedElements={['strong','a','code','em','p','img','ul','ol','li','blockquote','pre','h3','h4']}>
              {content}
            </MarkdownRenderer>
          ) : (
            <p className="text-[var(--color-text-muted)] italic text-xs">暂无内容</p>
          )}
        </div>
      ) : (
        <Textarea
          id={textareaId}
          placeholder={replyTarget ? `回复 @${replyTarget.name}...` : placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? '发送中...' : replyTarget ? '回复' : '发表评论'}
        </Button>
        <EmojiPicker onSelect={(text) => insertAtCursor(text)} />
        <label className={`px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer transition-colors ${imageUploading ? 'opacity-50' : ''}`}>
          {imageUploading ? '⏳' : '🖼️'}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className={`text-[10px] px-2 py-1 rounded cursor-pointer transition-colors ${preview ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'}`}
        >
          {preview ? '编辑' : '预览'}
        </button>
        <span className="text-[10px] text-[var(--color-text-muted)]">支持 Markdown / 图片 / 表情</span>
      </div>
    </form>
  )
}
