import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { PostCard } from '@/components/blog/PostCard'
import logoImg from '@/assets/logo.png'

export function Home() {
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    api.get('/posts', { params: { page_size: 5 } }).then((res) => setPosts(res.data.items))
  }, [])

  return (
    <div className="min-h-[80vh] flex flex-col justify-center">
      <section className="py-24 md:py-32 flex justify-center">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 max-w-2xl">
          <img src={logoImg} alt="Hety" className="w-28 h-28 md:w-36 md:h-36 object-contain rounded-2xl shrink-0" />
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl text-[var(--color-text)] leading-snug mb-3 tracking-wide font-light">
              Hety 的个人主页
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] leading-loose">
              技术、思考与生活。
            </p>
          </div>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="border-t border-[var(--color-border)]/50 pt-10 pb-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs text-[var(--color-text-muted)] tracking-[0.2em]">最近</h2>
            <Link to="/blog" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
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

      <div className="text-center py-10 border-t border-[var(--color-border)]/30 mt-auto">
        <p className="text-xs text-[var(--color-text-muted)]">感谢来访。</p>
      </div>
    </div>
  )
}
