import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import 'katex/dist/katex.min.css'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { CommentSection } from '@/components/blog/CommentSection'
import { ArticleLayout } from '@/components/blog/ArticleLayout'
import { fetchAllArticleNavItems, type ArticleNavItem } from '@/services/articleNavigation'

interface Post {
  id: number
  title: string
  content: string
  cover_image: string | null
  created_at: string
  like_count: number
  view_count: number
  comment_count: number
}

export function PostDetail() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likeLoading, setLikeLoading] = useState(false)
  const { user } = useAuth()

  const [navItems, setNavItems] = useState<ArticleNavItem[]>([])

  useEffect(() => {
    api.get(`/posts/${id}`).then((res) => {
      const p = res.data
      setPost(p)
      setLikeCount(p.like_count || 0)
      setLoading(false)

      if (user) api.post(`/posts/${p.id}/view`).catch(() => {})
    }).catch(() => setLoading(false))
  }, [id, user])

  useEffect(() => {
    fetchAllArticleNavItems('/posts', { type: 'blog' }).then(setNavItems).catch(() => {})
  }, [])

  const toggleLike = async () => {
    if (!user || likeLoading || !post) return
    setLikeLoading(true)
    try {
      const res = await api.post(`/posts/${post.id}/like`)
      setLiked(res.data.liked)
      setLikeCount(res.data.like_count)
    } finally {
      setLikeLoading(false)
    }
  }

  if (loading) return <div className="text-center text-stone-300 py-12 italic">Loading...</div>
  if (!post) return <div className="text-center text-stone-300 py-12 italic">Post not found.</div>

  const ts = new Date(post.created_at)
  const dateStr = ts.toLocaleDateString('zh-CN')
  const timeStr = ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return (
    <ArticleLayout
      content={post.content}
      navItems={navItems}
      currentId={post.id}
      navBasePath="/blog"
      navTitle="全部文章"
    >
    <article className="max-w-4xl mx-auto pb-6">
      {post.cover_image && (
        <img src={post.cover_image} alt={post.title} className="w-full h-64 object-cover rounded-xl mb-6" />
      )}
      <h1 className="text-3xl md:text-4xl leading-tight text-[var(--color-text)] mb-4" style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>
        {post.title}
      </h1>
      <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] italic mb-10">
        <span>{dateStr} {timeStr}</span>
        <span>{post.view_count} views</span>
      </div>
      <div className="prose max-w-none mb-12">
        <MarkdownRenderer>
          {post.content}
        </MarkdownRenderer>
      </div>

      <div className="flex items-center gap-6 py-5 border-t border-b border-[var(--color-border)] mb-10">
        <button
          onClick={toggleLike}
          disabled={!user || likeLoading}
          className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full cursor-pointer transition-colors ${
            liked ? 'bg-red-100 text-red-600' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
        <span className="text-sm text-stone-400">{post.comment_count} 评论</span>
        <span className="text-sm text-stone-300">{post.view_count} 阅读</span>
        {!user && <span className="text-xs text-stone-300">登录后点赞</span>}
      </div>

      <CommentSection key={post.id} postId={post.id} totalComments={post.comment_count} />

    </article>
    </ArticleLayout>
  )
}
