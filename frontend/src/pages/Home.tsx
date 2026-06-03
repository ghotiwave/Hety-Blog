import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { PostCard } from '@/components/blog/PostCard'

export function Home() {
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    api.get('/posts', { params: { page_size: 5 } }).then((res) => setPosts(res.data.items))
  }, [])

  return (
    <div className="min-h-[80vh] flex flex-col justify-center">
      <section className="py-24 md:py-32">
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-4xl text-[#3a3a38] leading-snug mb-8 tracking-wide font-light">
            欢迎来到
            <br />
            Hety 的个人主页
          </h1>
          <p className="text-sm text-[#b5b4af] leading-loose max-w-md">
            技术、思考与生活。
          </p>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="border-t border-[#e8e6e0]/50 pt-10 pb-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs text-[#c5c4bf] tracking-[0.2em]">最近</h2>
            <Link to="/blog" className="text-xs text-[#c5c4bf] hover:text-[#8b7355] transition-colors">
              全部 &rarr;
            </Link>
          </div>
          {posts.map((p) => (
            <PostCard
              key={p.id}
              id={p.id}
              title={p.title}
              summary={p.summary}
              coverImage={p.cover_image}
              tags={p.tags}
              createdAt={p.created_at}
              commentCount={p.comment_count}
              likeCount={p.like_count}
              viewCount={p.view_count}
            />
          ))}
        </section>
      )}

      <div className="text-center py-10 border-t border-[#e8e6e0]/30 mt-auto">
        <p className="text-xs text-[#c5c4bf]">感谢来访。</p>
      </div>
    </div>
  )
}
