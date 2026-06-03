import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { CommentSection } from '@/components/blog/CommentSection'

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

  useEffect(() => {
    api.get(`/posts/${id}`).then((res) => {
      setPost(res.data)
      setLikeCount(res.data.like_count || 0)
    }).finally(() => setLoading(false))

    // Record view if logged in
    if (user && id) {
      api.post(`/posts/${id}/view`).catch(() => {})
    }
  }, [id, user])

  const toggleLike = async () => {
    if (!user || likeLoading) return
    setLikeLoading(true)
    try {
      const res = await api.post(`/posts/${id}/like`)
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
    <article className="max-w-3xl mx-auto">
      {post.cover_image && (
        <img src={post.cover_image} alt={post.title} className="w-full h-64 object-cover rounded-xl mb-6" />
      )}
      <h1 className="text-3xl text-stone-800 mb-2" style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>
        {post.title}
      </h1>
      <div className="flex items-center gap-4 text-sm text-stone-400 italic mb-8">
        <span>{dateStr} {timeStr}</span>
        <span>{post.view_count} views</span>
      </div>
      <div className="prose max-w-none mb-8">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>

      <div className="flex items-center gap-6 py-4 border-t border-b border-amber-200/60 mb-8">
        <button
          onClick={toggleLike}
          disabled={!user || likeLoading}
          className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full cursor-pointer transition-colors ${
            liked ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
        <span className="text-sm text-stone-400">{post.comment_count} comments</span>
        <span className="text-sm text-stone-300">{post.view_count} views</span>
        {!user && <span className="text-xs text-stone-300 italic">Login to like</span>}
      </div>

      <CommentSection postId={post.id} />
    </article>
  )
}
