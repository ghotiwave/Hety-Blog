import { useState, useEffect, useMemo } from 'react'
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

/** Split markdown into spotlight section + remaining sections */
function parseSections(md: string): { spotlight: string; sections: string[] } {
  const blocks = md.split(/\n(?=## )/).filter((b) => b.trim())
  let spotlight = ''
  const others: string[] = []
  for (const b of blocks) {
    if (b.match(/^##\s*[🔥🆕🔴].*(今日|特别|关注|重点|头条)/) || b.match(/特别关注/)) {
      spotlight = b
    } else if (b.startsWith('## ')) {
      others.push(b)
    }
  }
  // If no spotlight found, take the first block
  if (!spotlight && blocks.length > 0 && !blocks[0].startsWith('# ')) {
    spotlight = blocks[0]
    return { spotlight: '', sections: blocks }
  }
  return { spotlight, sections: others }
}

export function DigestDetail() {
  const { id } = useParams<{ id: string }>()
  const [digest, setDigest] = useState<Digest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/digests/${id}`).then((res) => setDigest(res.data)).finally(() => setLoading(false))
  }, [id])

  const { spotlight, sections } = useMemo(
    () => (digest ? parseSections(digest.content) : { spotlight: '', sections: [] as string[] }),
    [digest],
  )

  if (loading) return <div className="text-center text-[var(--color-text-muted)] py-12">加载中...</div>
  if (!digest) return <div className="text-center text-[var(--color-text-muted)] py-12">日报未找到。</div>

  return (
    <ArticleLayout content={digest.content}>
      <div className="max-w-5xl mx-auto">
        <Link to="/digest">
          <Button variant="ghost" size="sm" className="mb-4">← 返回</Button>
        </Link>

        {/* Masthead */}
        <header className="mb-10 pb-4 border-b-2 border-[var(--color-text)]">
          <h1 className="text-2xl text-[var(--color-text)] font-bold tracking-tight mb-1">{digest.title}</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {new Date(digest.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        {/* Spotlight — full width hero */}
        {spotlight && (
          <section className="mb-12 p-6 md:p-8 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/40">
            <div className="prose max-w-none
              prose-h2:text-xl prose-h2:font-bold prose-h2:mt-0 prose-h2:mb-6 prose-h2:text-[var(--color-text)]
              prose-li:text-[var(--color-text)] prose-li:leading-relaxed prose-li:mb-3 prose-li:tracking-wide
              prose-p:leading-relaxed prose-p:tracking-wide
              [&>ul]:space-y-3
              [&_blockquote]:text-xs [&_blockquote]:text-[var(--color-text-muted)] [&_blockquote]:border-l-0 [&_blockquote]:pl-0 [&_blockquote]:mt-1 [&_blockquote]:mb-0 [&_blockquote]:italic
            ">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeSlug]}>
                {spotlight}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {/* Section boxes — wide single column with internal 2-col flow */}
        {sections.length > 0 && (
          <div className="space-y-6 md:space-y-8">
            {sections.map((sec, i) => (
              <section
                key={i}
                className="p-6 md:p-8 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/30 hover:border-[var(--color-primary)]/30 transition-colors"
              >
                <div className="prose max-w-none
                  prose-h2:text-lg prose-h2:font-bold prose-h2:mt-0 prose-h2:mb-5 prose-h2:pb-3 prose-h2:border-b prose-h2:border-[var(--color-border)] prose-h2:text-[var(--color-text)] prose-h2:column-span-all
                  prose-h3:text-sm prose-h3:font-semibold prose-h3:text-[var(--color-text-muted)] prose-h3:mb-4 prose-h3:mt-0
                  prose-li:text-[var(--color-text)] prose-li:leading-relaxed prose-li:mb-2 prose-li:tracking-wide
                  prose-p:leading-relaxed prose-p:tracking-wide
                  [&>ul]:columns-1 md:[&>ul]:columns-2 md:[&>ul]:gap-8
                  [&>ul>li]:break-inside-avoid
                  [&_blockquote]:text-[11px] [&_blockquote]:text-[var(--color-text-muted)] [&_blockquote]:border-l-0 [&_blockquote]:pl-0 [&_blockquote]:mt-1 [&_blockquote]:mb-0 [&_blockquote]:opacity-70
                  [&_blockquote_a]:text-[var(--color-primary)]
                ">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeSlug]}>
                    {sec}
                  </ReactMarkdown>
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Divider */}
        {digest.source_urls && <div className="mt-12 pt-4 border-t border-[var(--color-border)]" />}

        {/* Sources — compact grid */}
        {digest.source_urls && (() => {
          try {
            const urls: string[] = JSON.parse(digest.source_urls)
            if (!urls.length) return null
            return (
              <div className="mt-4">
                <h3 className="text-xs text-[var(--color-text-muted)] tracking-[0.2em] mb-2">来源</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                  {urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] truncate transition-colors block">
                      {url.replace(/^https?:\/\//, '').slice(0, 50)}
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
