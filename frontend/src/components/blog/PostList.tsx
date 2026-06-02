import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import { PostCard } from './PostCard'
import { Input } from '@/components/ui/Input'

interface Post {
  id: number
  title: string
  summary: string | null
  cover_image: string | null
  tags: string | null
  created_at: string
  comment_count: number
}

export function PostList() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Collect all unique tags from posts
  const allTags = [...new Set(posts.flatMap((p) => (p.tags || '').split(',').map((t) => t.trim()).filter(Boolean)))]

  useEffect(() => {
    setLoading(true)
    api.get('/posts', {
      params: { page, q: q || undefined, tag: activeTag || undefined },
    }).then((res) => {
      setPosts(res.data.items)
      setTotalPages(res.data.total_pages)
    }).finally(() => setLoading(false))
  }, [page, q, activeTag])

  const toggleTag = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? '' : tag))
    setPage(1)
  }, [])

  return (
    <div>
      <Input
        placeholder="Search posts..."
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1) }}
        className="mb-4"
      />

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-0.5 rounded-full text-xs cursor-pointer transition-colors ${
                activeTag === tag
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center text-stone-300 py-12 italic">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-stone-300 py-12 italic">No posts yet.</div>
      ) : (
        <>
          {posts.map((p) => (
            <PostCard
              key={p.id}
              {...p}
              coverImage={p.cover_image}
              createdAt={p.created_at}
              commentCount={p.comment_count}
              activeTag={activeTag}
              onTagClick={toggleTag}
            />
          ))}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded text-sm cursor-pointer ${
                    page === i + 1 ? 'bg-amber-700 text-white' : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
