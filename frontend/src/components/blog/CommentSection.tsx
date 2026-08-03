import { useState, useEffect, useCallback, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmojiPicker } from '@/components/blog/EmojiPicker'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'

function UserCard({ comment, onClose }: { comment: Comment; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return (
    <div ref={ref} className="absolute z-50 mt-2">
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg p-4 w-56">
        <div className="flex items-center gap-3 mb-3">
          {comment.avatar_url ? (
            <img src={comment.avatar_url} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover border border-[var(--color-border)]" />
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
            {comment.author_role === 'guest' && (
              <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">游客</span>
            )}
          </div>
        </div>
        {comment.signature ? (
          <div className="prose markdown-compact max-w-none text-xs text-[var(--color-text-muted)] leading-relaxed border-t border-[var(--color-border)]/50 pt-2 break-words">
            <MarkdownRenderer>{comment.signature}</MarkdownRenderer>
          </div>
        ) : (
          <div className="text-xs text-[var(--color-text-muted)]/50 italic border-t border-[var(--color-border)]/50 pt-2">暂无签名</div>
        )}
      </div>
    </div>
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

export function CommentSection({ postId, totalComments }: { postId: number; totalComments: number }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [sort, setSort] = useState<'time' | 'hot'>('time')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)
  const { user } = useAuth()
  const [replyTarget, setReplyTarget] = useState<{ id: number; name: string } | null>(null)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('')

  useEffect(() => {
    if (user) return
    api.get('/auth/config')
      .then((response) => setTurnstileSiteKey(response.data.turnstile_site_key || ''))
      .catch(() => {})
  }, [user])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasMore = page < totalPages

  const fetchComments = useCallback((p = 1) => {
    const pg = p
    const requestId = ++requestIdRef.current
    api.get(`/posts/${postId}/comments`, { params: { sort, page: pg } }).then((res) => {
      if (requestId !== requestIdRef.current) return
      if (pg === 1) {
        setComments(res.data.items)
      } else {
        setComments((prev) => [...prev, ...res.data.items])
      }
      setTotal(res.data.total)
      setError('')
    }).catch(() => {
      if (requestId === requestIdRef.current) setError('评论加载失败，请稍后重试。')
    }).finally(() => {
      if (requestId === requestIdRef.current) setLoadingMore(false)
    })
  }, [postId, sort])

  useEffect(() => {
    fetchComments(1)
  }, [fetchComments])

  const changeSort = (nextSort: 'time' | 'hot') => {
    if (nextSort === sort) return
    setComments([])
    setPage(1)
    setTotal(0)
    setReplyTarget(null)
    setSort(nextSort)
  }

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
          评论 ({total || totalComments})
        </h2>
        <div className="flex gap-2 text-sm">
          {(['time', 'hot'] as const).map((s) => (
            <button
              key={s}
              onClick={() => changeSort(s)}
              className={`px-3 py-1 rounded cursor-pointer transition-colors ${sort === s ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              {s === 'time' ? '最新' : '最热'}
            </button>
          ))}
        </div>
      </div>

      {!user && (
        <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
          可直接以游客身份评论，昵称和邮箱均可选；邮箱仅管理员可见。
          {' '}<Link to="/login" className="text-[var(--color-primary)] hover:underline">登录</Link> 后可同步身份、点赞和阅读记录。
        </div>
      )}

      {/* New comment form — only when not replying */}
      {!replyTarget && (
        <CommentForm
          postId={postId}
          placeholder="发表评论..."
          onSubmit={fetchComments}
          replyTarget={null}
          onCancelReply={() => {}}
          guestMode={!user}
          turnstileSiteKey={turnstileSiteKey}
        />
      )}

      <div className="space-y-0">
        {error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            <button type="button" onClick={() => fetchComments(1)} className="mt-3 text-sm text-[var(--color-primary)] hover:underline">重新加载</button>
          </div>
        )}
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            postId={postId}
            replyTarget={replyTarget}
            onReply={(id, name) => setReplyTarget({ id, name })}
            onCancelReply={() => setReplyTarget(null)}
            onRefresh={() => fetchComments(1)}
            turnstileSiteKey={turnstileSiteKey}
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

function CommentItem({ comment, postId, replyTarget, onReply, onCancelReply, onRefresh, turnstileSiteKey }: {
  comment: Comment
  postId: number
  replyTarget: { id: number; name: string } | null
  onReply: (id: number, name: string) => void
  onCancelReply: () => void
  onRefresh: () => void
  turnstileSiteKey: string
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
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={`查看 ${comment.author_name} 的资料`}
            aria-expanded={showUserCard}
            onClick={() => setShowUserCard(!showUserCard)}
          >
            {comment.avatar_url ? (
              <img src={comment.avatar_url} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] cursor-pointer hover:opacity-80 transition-opacity" />
            ) : (
              <span className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-sm text-[var(--color-text-muted)] cursor-pointer hover:opacity-80 transition-opacity">
                {comment.author_name[0]}
              </span>
            )}
          </button>
          {showUserCard && <UserCard comment={comment} onClose={() => setShowUserCard(false)} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button type="button" className="font-medium text-sm text-[var(--color-text)] cursor-pointer hover:text-[var(--color-primary)] transition-colors" onClick={() => setShowUserCard(!showUserCard)}>{comment.author_name}</button>
            {comment.author_role === 'admin' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium">管理员</span>
            )}
            {comment.author_role === 'guest' && (
              <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">游客</span>
            )}
            <span className="text-xs text-[var(--color-text-muted)]">{new Date(comment.created_at).toLocaleString('zh-CN')}</span>
          </div>
          <div className="text-sm text-[var(--color-text)] prose markdown-compact max-w-none mb-2">
            {comment.reply_to_name && (
              <span className="text-[var(--color-primary)] mr-1">回复 @{comment.reply_to_name}:</span>
            )}
            <MarkdownRenderer>
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
                    <img src={r.avatar_url} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xs text-[var(--color-text-muted)] shrink-0">
                      {r.author_name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-[var(--color-text)]">{r.author_name}</span>
                      {r.author_role === 'admin' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium">管理员</span>
                      )}
                      {r.author_role === 'guest' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)] font-medium">游客</span>
                      )}
                      <span className="text-xs text-[var(--color-text-muted)]">{new Date(r.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="text-sm text-[var(--color-text)] prose markdown-compact max-w-none">
                      {r.reply_to_name && <span className="text-[var(--color-primary)] mr-1">@ {r.reply_to_name}</span>}
                      <MarkdownRenderer>
                        {r.content}
                      </MarkdownRenderer>
                    </div>
                    <button onClick={() => onReply(r.id, r.author_name)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer mt-1">回复</button>
                    {/* Inline form for replying to this reply */}
                    {replyTarget?.id === r.id && (
                      <div className="mt-2">
                        <CommentForm
                          postId={postId}
                          placeholder={`回复 @${r.author_name}...`}
                          onSubmit={() => { onCancelReply(); onRefresh() }}
                          replyTarget={replyTarget}
                          onCancelReply={onCancelReply}
                          guestMode={!user}
                          turnstileSiteKey={turnstileSiteKey}
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
          {isReplying && (
            <div className="mt-3 ml-4">
              <CommentForm
                postId={postId}
                placeholder={`回复 @${replyTarget!.name}...`}
                onSubmit={() => { onCancelReply(); onRefresh() }}
                replyTarget={replyTarget}
                onCancelReply={onCancelReply}
                guestMode={!user}
                turnstileSiteKey={turnstileSiteKey}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentForm({ postId, placeholder, onSubmit, replyTarget, onCancelReply, guestMode = false, turnstileSiteKey = '' }: {
  postId: number
  placeholder: string
  onSubmit: () => void
  replyTarget: { id: number; name: string } | null
  onCancelReply: () => void
  guestMode?: boolean
  turnstileSiteKey?: string
}) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [formError, setFormError] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileVersion, setTurnstileVersion] = useState(0)
  const textareaId = useId()
  const handleTurnstileError = useCallback(() => {
    setFormError('人机验证组件加载失败，请刷新页面重试。')
  }, [])

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
    e.target.value = ''
    if (!file) return
    setImageUploading(true)
    setFormError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post('/admin/upload', form)
      if (res.data.url) insertAtCursor(`![](${res.data.url})`)
    } catch {
      setFormError('图片上传失败，请检查文件格式和大小后重试。')
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    if (guestMode && turnstileSiteKey && !turnstileToken) {
      setFormError('请先完成人机验证。')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      await api.post(`/posts/${postId}/comments`, {
        content: content.trim(),
        parent_id: replyTarget?.id || null,
        guest_name: guestMode ? guestName.trim() || null : null,
        guest_email: guestMode ? guestEmail.trim() || null : null,
        turnstile_token: guestMode ? turnstileToken || null : null,
      })
      setContent('')
      setTurnstileToken('')
      setTurnstileVersion((version) => version + 1)
      onCancelReply()
      onSubmit()
    } catch (error: unknown) {
      if (guestMode && turnstileSiteKey) {
        setTurnstileToken('')
        setTurnstileVersion((version) => version + 1)
      }
      const detail = typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
        : null
      setFormError(typeof detail === 'string' ? detail : '评论发送失败，请稍后重试。')
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
      {guestMode && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="昵称 / ID（可选）"
            maxLength={20}
            autoComplete="nickname"
          />
          <Input
            type="email"
            value={guestEmail}
            onChange={(event) => setGuestEmail(event.target.value)}
            placeholder="邮箱（可选且不公开）"
            maxLength={100}
            autoComplete="email"
          />
        </div>
      )}
      {preview ? (
        <div className="min-h-[100px] p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/30 text-sm prose markdown-compact max-w-none prose-a:text-[var(--color-primary)]">
          {content ? (
            <MarkdownRenderer>
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
          maxLength={5000}
          required
        />
      )}
      {guestMode && turnstileSiteKey && (
        <TurnstileWidget
          key={turnstileVersion}
          siteKey={turnstileSiteKey}
          onTokenChange={setTurnstileToken}
          onError={handleTurnstileError}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? '发送中...' : replyTarget ? '回复' : '发表评论'}
        </Button>
        <EmojiPicker onSelect={(text) => insertAtCursor(text)} />
        {!guestMode && (
          <label className={`px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer transition-colors ${imageUploading ? 'opacity-50' : ''}`}>
            {imageUploading ? '⏳' : '🖼️'}
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={imageUploading} className="hidden" />
          </label>
        )}
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className={`text-[10px] px-2 py-1 rounded cursor-pointer transition-colors ${preview ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'}`}
        >
          {preview ? '编辑' : '预览'}
        </button>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {guestMode ? '支持 Markdown / 表情' : '支持 Markdown / 图片 / 表情'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[10px]">
        {formError ? <p role="alert" className="text-red-600 dark:text-red-300">{formError}</p> : <span />}
        <span className="shrink-0 text-[var(--color-text-muted)]">{content.length}/5000</span>
      </div>
    </form>
  )
}
