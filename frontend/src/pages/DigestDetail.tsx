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
interface NewsItem { title: string; desc: string; sourceUrl: string; sourceLabel: string }
interface SectionBlock { heading: string; subBlocks: { subheading: string; items: NewsItem[] }[] }

/** Parse `- **title**: desc  \n> 原文：[label](url)` patterns into NewsItem[] */
function parseItems(body: string): NewsItem[] {
  const items: NewsItem[] = []
  const lines = body.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    // Match various formats: - **title**: desc  or  - title：desc  or  - **title**：desc
    const m = line.match(/^-\s+(?:\*\*?)?(.+?)(?:\*\*?)?\s*[：:]\s*(.+)/)
    if (m) {
      const title = m[1].replace(/\*+/g, '').trim()
      const desc = m[2].trim()
      let sourceUrl = ''; let sourceLabel = ''
      if (i + 1 < lines.length) {
        const sm = lines[i + 1].match(/^\s*>\s*(?:原文|来源|查看原文|原文链接)[：:]\s*\[(.+?)\]\((.+?)\)/)
        if (sm) { sourceLabel = sm[1]; sourceUrl = sm[2]; i++ }
      }
      items.push({ title, desc, sourceUrl, sourceLabel })
    }
    i++
  }
  return items
}

/** Parse body into subBlocks grouped by ### headings */
function parseSubBlocks(body: string): { subheading: string; items: NewsItem[] }[] {
  const blocks: { subheading: string; items: NewsItem[] }[] = []
  const parts = body.split(/\n(?=### )/)
  for (const part of parts) {
    const hMatch = part.match(/^###\s+(.+)/)
    const subheading = hMatch ? hMatch[1] : ''
    const rest = hMatch ? part.replace(/^###\s+.+\n/, '') : part
    const items = parseItems(rest)
    if (items.length > 0 || subheading) {
      blocks.push({ subheading, items })
    }
  }
  return blocks
}

/** Extract ## sections from full markdown, return spotlight + list of {heading, body} */
function parseSections(md: string): { spotlight: string; sections: { heading: string; body: string }[] } {
  const blocks = md.split(/\n(?=## )/).filter((b) => b.trim() && !b.trim().startsWith('# '))
  let spotlight = ''
  const sections: { heading: string; body: string }[] = []
  for (const b of blocks) {
    const hMatch = b.match(/^##\s+(.+)/)
    const heading = hMatch ? hMatch[1] : ''
    const body = hMatch ? b.replace(/^##\s+.+\n/, '') : b
    if (heading.includes('特别关注') || heading.includes('🔥') || heading.includes('🆕')) {
      spotlight = body
    } else {
      sections.push({ heading, body })
    }
  }
  return { spotlight, sections }
}

/** Mini card — equal-height flex column, badge pinned to bottom. Click to expand full content. */
function NewsCard({ item, onClick }: { item: NewsItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="h-full flex flex-col p-4 rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg)] shadow-sm transition-colors hover:border-[var(--color-primary)]/40 hover:shadow-md cursor-pointer"
    >
      <div className="flex-1">
        <div className="text-sm font-semibold text-[var(--color-text)] mb-1.5 leading-snug prose-a:text-[var(--color-primary)] [&_strong]:text-[var(--color-text)]">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} allowedElements={['strong', 'a', 'code', 'em']}>
            {item.title}
          </ReactMarkdown>
        </div>
        <div className="text-xs text-[var(--color-text)]/75 leading-relaxed mb-4 line-clamp-4">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} allowedElements={['strong', 'a', 'code', 'em', 'p']}>
            {item.desc}
          </ReactMarkdown>
        </div>
      </div>
      {item.sourceUrl && (
        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-block text-xs px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors truncate max-w-full w-fit"
        >
          {item.sourceLabel}
        </a>
      )}
    </div>
  )
}

/** Full-content modal shown when a news card is clicked */
function NewsModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-2xl cursor-pointer leading-none"
        >
          &times;
        </button>

        <div className="pr-8">
          <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 leading-snug">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} allowedElements={['strong', 'a', 'code', 'em']}>
              {item.title}
            </ReactMarkdown>
          </h2>
          <div className="text-sm text-[var(--color-text)] leading-relaxed prose max-w-none prose-a:text-[var(--color-primary)]">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {item.desc}
            </ReactMarkdown>
          </div>
        </div>

        {item.sourceUrl && (
          <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
            >
              <span className="text-xs">↗</span> {item.sourceLabel || '查看原文'}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export function DigestDetail() {
  const { id } = useParams<{ id: string }>()
  const [digest, setDigest] = useState<Digest | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<NewsItem | null>(null)

  useEffect(() => {
    api.get(`/digests/${id}`).then((res) => setDigest(res.data)).finally(() => setLoading(false))
  }, [id])

  const parsed = useMemo(() => {
    if (!digest) return null
    const { spotlight, sections } = parseSections(digest.content)
    const spotlightItems = parseItems(spotlight)
    const sectionBlocks: SectionBlock[] = sections
      .map((s) => ({ heading: s.heading, subBlocks: parseSubBlocks(s.body) }))
      .filter((s) => s.subBlocks.length > 0 && s.subBlocks.some((b) => b.items.length > 0))
    return { spotlightItems, sectionBlocks, sourceUrls: digest.source_urls ? (() => {
      try { return JSON.parse(digest.source_urls) as string[] } catch { return [] }
    })() : [] }
  }, [digest])

  if (loading) return <div className="text-center text-[var(--color-text-muted)] py-12">加载中...</div>
  if (!digest || !parsed) return <div className="text-center text-[var(--color-text-muted)] py-12">日报未找到。</div>

  const { spotlightItems, sectionBlocks, sourceUrls } = parsed

  return (
    <ArticleLayout content={digest.content}>
      <div className="max-w-6xl mx-auto">
        <Link to="/digest">
          <Button variant="ghost" size="sm" className="mb-4">← 返回</Button>
        </Link>

        {/* Masthead */}
        <header className="mb-8 pb-4 border-b-2 border-[var(--color-text)]">
          <h1 className="text-2xl text-[var(--color-text)] font-bold tracking-tight mb-1">{digest.title}</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {new Date(digest.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        {/* Spotlight — 3-col grid */}
        {spotlightItems.length > 0 && (
          <section className="mb-8 p-6 md:p-8 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/60">
            <h2 id="今日特别关注" className="text-lg font-bold text-[var(--color-text)] mb-5 pb-3 border-b border-[var(--color-border)]">
              🔥 今日特别关注
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-stretch">
              {spotlightItems.map((item, i) => (
                <NewsCard key={i} item={item} onClick={() => setExpanded(item)} />
              ))}
            </div>
          </section>
        )}

        {/* Section boxes */}
        <div className="space-y-6">
          {sectionBlocks.map((sec, si) => (
            <section
              key={si}
              className="p-6 md:p-8 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/60"
            >
              <h2 id={sec.heading.replace(/[🔥🆕📊📈💡🛠️🤖📰🌐]/g, '').trim()} className="text-lg font-bold text-[var(--color-text)] mb-5 pb-3 border-b border-[var(--color-border)]">
                {sec.heading}
              </h2>
              {sec.subBlocks.map((sub, sbi) => (
                <div key={sbi} className={sbi > 0 ? 'mt-6' : ''}>
                  {sub.subheading && (
                    <h3 className="text-sm font-bold text-[var(--color-text)] mb-3 tracking-wide">
                      {sub.subheading}
                    </h3>
                  )}
                  {sub.items.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 items-stretch">
                      {sub.items.map((item, ii) => (
                        <NewsCard key={ii} item={item} onClick={() => setExpanded(item)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>

        {/* Sources */}
        {sourceUrls.length > 0 && (
          <div className="mt-10 pt-4 border-t border-[var(--color-border)]">
            <h3 className="text-xs text-[var(--color-text-muted)] tracking-[0.2em] mb-2">来源</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1">
              {sourceUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] truncate transition-colors">
                  {url.replace(/^https?:\/\//, '').slice(0, 50)}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {expanded && <NewsModal item={expanded} onClose={() => setExpanded(null)} />}
    </ArticleLayout>
  )
}
