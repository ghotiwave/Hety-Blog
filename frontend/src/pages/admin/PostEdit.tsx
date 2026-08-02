import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '@/services/api'
import { PostForm } from '@/components/admin/PostForm'

interface EditablePost {
  id: number
  title: string
  content: string
  summary: string | null
  cover_image: string | null
  tags: string | null
  post_type?: string
  published: boolean
}

export function PostEdit() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<EditablePost | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      let active = true
      api.get(`/admin/posts/${id}`).then((res) => {
        if (active) setPost(res.data)
      }).catch(() => {
        if (active) setError('文章加载失败或已被删除。')
      }).finally(() => {
        if (active) setLoading(false)
      })
      return () => { active = false }
    }
  }, [id])

  if (loading) return <div className="text-center text-[var(--color-text-muted)] py-12">加载中...</div>
  if (id && (!post || error)) {
    return <div role="alert" className="py-12 text-center text-sm text-red-600 dark:text-red-300">{error || '文章不存在。'}</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-8">
        {post ? '编辑文章' : '新文章'}
      </h1>
      <PostForm post={post ?? undefined} />
    </div>
  )
}
