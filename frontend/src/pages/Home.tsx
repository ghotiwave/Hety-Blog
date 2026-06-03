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
      {/* Hero */}
      <section className="py-20 md:py-28">
        <div className="max-w-2xl">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl text-stone-800 leading-tight mb-6 tracking-tight"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            欢迎来到
            <br />
            Hety 的个人主页
          </h1>
          <p className="text-lg md:text-xl text-stone-400 italic leading-relaxed max-w-lg">
            技术、思考与生活。
          </p>
          <p className="mt-5 text-sm text-stone-300 leading-relaxed max-w-md">
            一名热爱技术的开发者。这里记录着我的学习笔记、项目复盘，
            以及对 AI 与开源世界的观察。希望通过文字与你产生共鸣。
          </p>
        </div>
      </section>

      {/* Recent posts — only if there are any */}
      {posts.length > 0 && (
        <section className="border-t border-amber-200/40 pt-10 pb-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm text-stone-400 tracking-widest uppercase">Recent</h2>
            <Link to="/blog" className="text-xs text-stone-300 hover:text-amber-600 transition-colors">
              全部文章 &rarr;
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

      {/* Footer */}
      <div className="text-center py-6 border-t border-amber-200/40 mt-auto">
        <p className="text-xs text-stone-300/60">感谢来访。</p>
      </div>
    </div>
  )
}
