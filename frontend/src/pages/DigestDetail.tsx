import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import api from '@/services/api'
import { ArticleLayout } from '@/components/blog/ArticleLayout'
import rehypeSlug from 'rehype-slug'
import { Button } from '@/components/ui/Button'

interface Digest {
  id: number
  title: string
  topic: string
  content: string
  source_urls: string | null
  created_at: string
}

export function DigestDetail() {
  const { id } = useParams<{ id: string }>()
  const [digest, setDigest] = useState<Digest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/digests/${id}`).then((res) => {
      setDigest(res.data)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center text-[var(--color-text-muted)] py-12">加载中...</div>
  if (!digest) return <div className="text-center text-[var(--color-text-muted)] py-12">日报未找到。</div>

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/digest">
        <Button variant="ghost" size="sm" className="mb-6">← 返回</Button>
      </Link>

      <ArticleLayout content={digest.content}>
      <article>
        <header className="mb-10">
          <h1 className="text-2xl text-[var(--color-text)] mb-2 font-normal tracking-wide">{digest.title}</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {digest.topic} · {new Date(digest.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeSlug]}>
            {digest.content}
          </ReactMarkdown>
        </div>

        {digest.source_urls && (() => {
          try {
            const urls: string[] = JSON.parse(digest.source_urls)
            if (urls.length === 0) return null
            return (
              <div className="mt-10 pt-6 border-t border-[var(--color-border)]">
                <h3 className="text-xs text-[var(--color-text-muted)] tracking-[0.2em] mb-3">来源</h3>
                <ul className="space-y-1">
                  {urls.map((url, i) => (
                    <li key={i}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] break-all transition-colors">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )
          } catch { return null }
        })()}
      </article>
      </ArticleLayout>
    </div>
  )
}
