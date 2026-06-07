import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { EmojiPicker } from '@/components/blog/EmojiPicker'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'

function UserCard({ comment, onClose }: { comment: Comment; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 mt-2" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg p-4 w-56">
          <div className="flex items-center gap-3 mb-3">
            {comment.avatar_url ? (
              <img src={comment.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border border-[var(--color-border)]" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-lg text-[var(--color-text-muted)]">
                {comment.author_name[0]}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm text-[var(--color-text)]">{comment.author_name}</span>
              {comment.author_role === 'admin' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium">管理员</span>
              )}
            </div>
          </div>
          {comment.signature ? (
            <div className="text-xs text-[var(--color-text-muted)] leading-relaxed border-t border-[var(--color-border)]/50 pt-2">
              <MarkdownRenderer allowedElements={['strong','a','code','em','p']}>{comment.signature}</MarkdownRenderer>
            </div>
          ) : (
            <div className="text-xs text-[var(--color-text-muted)]/50 italic border-t border-[var(--color-border)]/50 pt-2">暂无签名</div>
          )}
        </div>
      </div>
    </>
  )
}

interface Comment {
  id: number
  user_id: number | null
  author_name: string
  author_role: string | null
  avatar_url: string | null
  signature: string | null
  content: string
  reply_to_name: string | null
  like_count: number
  user_liked: boolean
  reply_count: number
  created_at: string
  replies?: Comment[]
  parent_id?: number | null
}

const PAGE_SIZE = 10

export function CommentSection({ postId }: { postId: number }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [sort, setSort] = useState<'time' | 'hot'>('time')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const { user } = useAuth()
  const [replyTarget, setReplyTarget] = useState<{ id: number; name: string } | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasMore = page < totalPages

  const fetchComments = useCallback((p?: number) => {
    const pg = p ?? page
    api.get(`/posts/${postId}/comments`, { params: { sort, page: pg } }).then((res) => {
      if (pg === 1) {
        setComments(res.data.items)
      } else {
        setComments((prev) => [...prev, ...res.data.items])
      }
      setTotal(res.data.total)
    }).finally(() => setLoadingMore(false))
  }, [postId, sort, page])

  useEffect(() => { fetchComments(1) }, [sort])

  const loadMore = () => {
    setLoadingMore(true)
    const next = page + 1
    setPage(next)
    fetchComments(next)
  }

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

      {!user && (
        <div className="mb-6 py-4 px-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] text-center">
          <p className="text-[var(--color-text-muted)] text-sm">
            <Link to="/login" className="text-[var(--color-primary)] hover:underline">登录</Link> 后发表评论
          </p>
        </div>
      )}

      {/* New comment form — only when not replying */}
      {user && !replyTarget && (
        <CommentForm
          postId={postId}
          placeholder="发表评论..."
          onSubmit={fetchComments}
          replyTarget={null}
          onCancelReply={() => {}}
        />
      )}

      <div className="space-y-0">
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            postId={postId}
            replyTarget={replyTarget}
            onReply={(id, name) => setReplyTarget({ id, name })}
            onCancelReply={() => setReplyTarget(null)}
            onRefresh={() => fetchComments(1)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="text-center py-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer transition-colors"
          >
            {loadingMore ? '加载中...' : `加载更多评论 (${total - page * PAGE_SIZE} 条)`}
          </button>
        </div>
      )}
    </div>
  )
}

function CommentItem({ comment, postId, replyTarget, onReply, onCancelReply, onRefresh }: {
  comment: Comment
  postId: number
  replyTarget: { id: number; name: string } | null
  onReply: (id: number, name: string) => void
  onCancelReply: () => void
  onRefresh: () => void
}) {
  const [showReplies, setShowReplies] = useState(false)
  const [allReplies, setAllReplies] = useState<Comment[]>([])
  const [replyPage, setReplyPage] = useState(1)
  const [replyTotal, setReplyTotal] = useState(0)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [showUserCard, setShowUserCard] = useState(false)
  const { user } = useAuth()
  const isReplying = replyTarget?.id === comment.id
  const replyHasMore = replyTotal > allReplies.length

  const handleLike = async () => {
    if (!user) return
    await api.post(`/posts/${postId}/comments/${comment.id}/like`)
    onRefresh()
  }

  const loadReplies = () => {
    if (!comment.reply_count) return
    setShowReplies(!showReplies)
    if (!showReplies) {
      setReplyPage(1)
      api.get(`/posts/${postId}/comments/${comment.id}/replies`, { params: { page: 1 } })
        .then((res) => {
          setAllReplies(res.data.items)
          setReplyTotal(res.data.total)
        })
    }
  }

  const loadMoreReplies = () => {
    const next = replyPage + 1
    setLoadingReplies(true)
    api.get(`/posts/${postId}/comments/${comment.id}/replies`, { params: { page: next } })
      .then((res) => {
        setAllReplies((prev) => [...prev, ...res.data.items])
        setReplyTotal(res.data.total)
        setReplyPage(next)
      })
      .finally(() => setLoadingReplies(false))
  }

  return (
    <div className="border-b border-[var(--color-border)]/60 py-4">
      <div className="flex items-start gap-4">
        <button className="relative shrink-0" onClick={() => setShowUserCard(!showUserCard)}>
          {comment.avatar_url ? (
            <img src={comment.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] cursor-pointer hover:opacity-80 transition-opacity" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-sm text-[var(--color-text-muted)] cursor-pointer hover:opacity-80 transition-opacity">
              {comment.author_name[0]}
            </div>
          )}
          {showUserCard && <UserCard comment={comment} onClose={() => setShowUserCard(false)} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-[var(--color-text)] cursor-pointer hover:text-[var(--color-primary)] transition-colors" onClick={() => setShowUserCard(!showUserCard)}>{comment.author_name}</span>
            {comment.author_role === 'admin' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium">管理员</span>
            )}
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
                    {/* Inline form for replying to this reply */}
                    {replyTarget?.id === r.id && user && (
                      <div className="mt-2">
                        <CommentForm
                          postId={postId}
                          placeholder={`回复 @${r.author_name}...`}
                          onSubmit={() => { onCancelReply(); onRefresh() }}
                          replyTarget={replyTarget}
                          onCancelReply={onCancelReply}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {replyHasMore && (
                <div className="text-center py-2">
                  <button
                    onClick={loadMoreReplies}
                    disabled={loadingReplies}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer transition-colors"
                  >
                    {loadingReplies ? '加载中...' : `加载更多回复 (${replyTotal - allReplies.length} 条)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Inline reply form — appears below root comment */}
          {isReplying && user && (
            <div className="mt-3 ml-4">
              <CommentForm
                postId={postId}
                placeholder={`回复 @${replyTarget!.name}...`}
                onSubmit={() => { onCancelReply(); onRefresh() }}
                replyTarget={replyTarget}
                onCancelReply={onCancelReply}
              />
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
