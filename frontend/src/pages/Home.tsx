import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { PostCard } from '@/components/blog/PostCard'
import { Button } from '@/components/ui/Button'

export function Home() {
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    api.get('/posts', { params: { page_size: 3 } }).then((res) => setPosts(res.data.items))
  }, [])

  return (
    <div>
      <section className="text-center py-20">
        <h1 className="text-5xl text-stone-800 mb-5" style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>
          Welcome to MyBlog
        </h1>
        <p className="text-lg text-stone-400 italic mb-8 max-w-md mx-auto">
          A personal space for sharing thoughts, ideas, and stories.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/blog"><Button size="lg">Read Blog</Button></Link>
          <Link to="/about"><Button variant="secondary" size="lg">About Me</Button></Link>
        </div>
      </section>

      <section className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl text-stone-500 italic" style={{ fontFamily: 'Georgia, serif' }}>Recent Posts</h2>
          <Link to="/blog" className="text-sm text-amber-700 hover:underline italic">View all &rarr;</Link>
        </div>
        {posts.length === 0 ? (
          <p className="text-stone-300 text-center py-12 italic">No posts yet.</p>
        ) : (
          <div>
            {posts.map((p) => (
              <PostCard key={p.id} {...p} coverImage={p.cover_image} createdAt={p.created_at} commentCount={p.comment_count} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
