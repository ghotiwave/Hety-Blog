import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import api from '@/services/api'
import { ArticleLayout } from '@/components/blog/ArticleLayout'
import { Button } from '@/components/ui/Button'
import { fetchAllArticleNavItems, type ArticleNavItem } from '@/services/articleNavigation'

interface Digest {
  id: number; title: string; topic: string; content: string
  source_urls: string | null; created_at: string
}
interface NewsItem { title: string; desc: string; sourceUrl: string; sourceLabel: string }
interface SectionBlock { heading: string; subBlocks: { subheading: string; items: NewsItem[] }[] }

function slugId(text: string): string {
  return text
    .replace(/[^\w\s一-鿿-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
}

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

/** Parse `###/#### title\ndesc\n> 原文：...` format into NewsItem[] */
function parseDetailItems(body: string): NewsItem[] {
  const items: NewsItem[] = []
  const blocks = body.split(/\n(?=(?:#{3,4}) )/)
  for (const block of blocks) {
    const lines = block.split('\n')
    const hMatch = lines[0].match(/^#{3,4}\s+(.+)/)
    if (!hMatch) continue
    const title = hMatch[1].replace(/\*+/g, '').trim()
    const descLines: string[] = []
    let sourceUrl = ''; let sourceLabel = ''
    for (let j = 1; j < lines.length; j++) {
      const sm = lines[j].match(/^\s*>\s*(?:原文|来源|查看原文|原文链接)[：:]\s*\[(.+?)\]\((.+?)\)/)
      if (sm) { sourceLabel = sm[1]; sourceUrl = sm[2]; break }
      if (lines[j].trim()) descLines.push(lines[j])
    }
    items.push({ title, desc: descLines.join('\n').trim(), sourceUrl, sourceLabel })
  }
  return items
}

/** Parse body into subBlocks grouped by ### headings (when they act as subcategories) */
function parseSubBlocks(body: string): { subheading: string; items: NewsItem[] }[] {
  const blocks: { subheading: string; items: NewsItem[] }[] = []
  const parts = body.split(/\n(?=### )/)
  for (const part of parts) {
    const hMatch = part.match(/^###\s+(.+)/)
    const subheading = hMatch ? hMatch[1] : ''
    const rest = hMatch ? part.replace(/^###\s+.+\n/, '') : part
    let items = parseItems(rest)
    // Fallback 1: try ###/#### detail format (from rest)
    if (items.length === 0 && /^#{3,4} /m.test(rest)) {
      items = parseDetailItems(rest)
    }
    // Fallback 2: no sub-items found — treat the ### heading itself as an item title
    if (items.length === 0 && subheading && rest.trim()) {
      const m = rest.match(/^\s*>\s*(?:原文|来源|查看原文|原文链接)[：:]\s*\[(.+?)\]\((.+?)\)/)
      const sourceUrl = m ? m[2] : ''
      const sourceLabel = m ? m[1] : ''
      const desc = m ? rest.replace(/^\s*>\s*(?:原文|来源|查看原文|原文链接)[：:]\s*\[.+?\]\(.+?\)\s*/, '').trim() : rest.trim()
      items = [{ title: subheading.replace(/^\s*/, ''), desc, sourceUrl, sourceLabel }]
    }
    if (items.length > 0 || subheading) {
      blocks.push({ subheading: items.length > 0 ? '' : subheading, items })
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
    <article className="flex h-full flex-col rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-bg)] p-4 shadow-sm transition-colors hover:border-[var(--color-primary)]/40 hover:shadow-md">
      <button type="button" onClick={onClick} className="flex flex-1 cursor-pointer flex-col text-left">
      <span className="block flex-1">
        <span className="mb-1.5 block text-sm font-semibold leading-snug text-[var(--color-text)] [&_strong]:text-[var(--color-text)]">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} allowedElements={['strong', 'code', 'em']} unwrapDisallowed>
            {item.title}
          </ReactMarkdown>
        </span>
        <span className="mb-4 block line-clamp-4 text-xs leading-relaxed text-[var(--color-text)]/75">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} allowedElements={['strong', 'code', 'em']} unwrapDisallowed>
            {item.desc}
          </ReactMarkdown>
        </span>
      </span>
      </button>
      {item.sourceUrl && (
        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="inline-block text-xs px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors truncate max-w-full w-fit"
        >
          {item.sourceLabel}
        </a>
      )}
    </article>
  )
}

/** Full-content modal shown when a news card is clicked */
function NewsModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-dialog-title"
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="关闭新闻详情"
          className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-2xl cursor-pointer leading-none"
        >
          &times;
        </button>

        <div className="pr-8">
          <h2 id="news-dialog-title" className="text-lg font-bold text-[var(--color-text)] mb-4 leading-snug">
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
  const [loadedRouteId, setLoadedRouteId] = useState<string | undefined>()
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<NewsItem | null>(null)
  const [navItems, setNavItems] = useState<ArticleNavItem[]>([])

  useEffect(() => {
    const controller = new AbortController()
    api.get(`/digests/${id}`, { signal: controller.signal }).then((res) => {
      setDigest(res.data)
      setLoadedRouteId(id)
      setError('')
    }).catch((requestError) => {
      if (!axios.isCancel(requestError)) {
        setDigest(null)
        setLoadedRouteId(id)
        setError(requestError.response?.status === 404 ? '日报不存在。' : '日报加载失败，请稍后重试。')
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    fetchAllArticleNavItems('/digests').then(setNavItems).catch(() => {})
  }, [])

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

  if (loading || loadedRouteId !== id) return <div className="text-center text-[var(--color-text-muted)] py-12">正在加载日报…</div>
  if (!digest || !parsed) return <div className="text-center text-[var(--color-text-muted)] py-12">{error || '日报未找到。'}</div>

  const { spotlightItems, sectionBlocks, sourceUrls } = parsed

  return (
    <ArticleLayout
      content={digest.content}
      navItems={navItems}
      currentId={digest.id}
      navBasePath="/digest"
      navTitle="全部日报"
    >
      <div className="max-w-5xl mx-auto pb-8">
        <Link to="/digest">
          <Button variant="ghost" size="sm" className="mb-4">← 返回</Button>
        </Link>

        {/* Masthead */}
        <header className="mb-10 pb-6 border-b-2 border-[var(--color-text)]">
          <h1 className="text-3xl md:text-4xl leading-tight text-[var(--color-text)] font-bold tracking-tight mb-3">{digest.title}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {new Date(digest.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        {/* Spotlight — 3-col grid */}
        {spotlightItems.length > 0 && (
          <section className="mb-10 p-7 md:p-10 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]/60">
            <h2 id={slugId("🔥 今日特别关注")} className="text-xl font-bold text-[var(--color-text)] mb-7 pb-4 border-b border-[var(--color-border)]">
              🔥 今日特别关注
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
              {spotlightItems.map((item, i) => (
                <NewsCard key={i} item={item} onClick={() => setExpanded(item)} />
              ))}
            </div>
          </section>
        )}

        {/* Section boxes */}
        <div className="space-y-8">
          {sectionBlocks.map((sec, si) => (
            <section
              key={si}
              className="p-7 md:p-10 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]/60"
            >
              <h2 id={slugId(sec.heading)} className="text-xl font-bold text-[var(--color-text)] mb-7 pb-4 border-b border-[var(--color-border)]">
                {sec.heading}
              </h2>
              {sec.subBlocks.map((sub, sbi) => (
                <div key={sbi} className={sbi > 0 ? 'mt-8' : ''}>
                  {sub.subheading && (
                    <h3 className="text-[15px] font-bold text-[var(--color-text)] mb-4 tracking-wide">
                      {sub.subheading}
                    </h3>
                  )}
                  {sub.items.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
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
