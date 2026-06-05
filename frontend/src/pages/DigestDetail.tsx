import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import 'katex/dist/katex.min.css'
import api from '@/services/api'
import { ArticleLayout } from '@/components/blog/ArticleLayout'
import { Button } from '@/components/ui/Button'

interface Digest {
  id: number; title: string; topic: string; content: string
  source_urls: string | null; created_at: string
}

export function DigestDetail() {
  const { id } = useParams<{ id: string }>()
  const [digest, setDigest] = useState<Digest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/digests/${id}`).then((res) => setDigest(res.data)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center text-[var(--color-text-muted)] py-12">加载中...</div>
  if (!digest) return <div className="text-center text-[var(--color-text-muted)] py-12">日报未找到。</div>

  return (
    <ArticleLayout content={digest.content}>
      <div className="max-w-5xl mx-auto">
        <Link to="/digest">
          <Button variant="ghost" size="sm" className="mb-4">← 返回</Button>
        </Link>

        {/* Masthead */}
        <header className="mb-8 pb-4 border-b-2 border-[var(--color-text)]">
          <h1 className="text-2xl text-[var(--color-text)] font-bold tracking-tight mb-1">{digest.title}</h1>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>{new Date(digest.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </header>

        {/* Newspaper columns on desktop */}
        <div className="prose max-w-none
          columns-1 md:columns-2 lg:columns-3
          gap-6 lg:gap-8
          [&>h2]:column-span-all
          [&>h2]:text-lg [&>h2]:font-bold [&>h2]:mt-0 [&>h2]:mb-4 [&>h2]:pb-2
          [&>h2]:border-b [&>h2]:border-[var(--color-border)]
          [&>p]:break-inside-avoid
          [&>ul]:break-inside-avoid-column
          [&>blockquote]:break-inside-avoid
          [&>hr]:column-span-all [&>hr]:my-6
        ">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeSlug]}>
            {digest.content}
          </ReactMarkdown>
        </div>

        {/* Sources */}
        {digest.source_urls && (() => {
          try {
            const urls: string[] = JSON.parse(digest.source_urls)
            if (!urls.length) return null
            return (
              <div className="mt-10 pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-xs text-[var(--color-text-muted)] tracking-[0.2em] mb-2">来源</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  {urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] truncate transition-colors">
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            )
          } catch { return null }
        })()}
      </div>
    </ArticleLayout>
  )
}
