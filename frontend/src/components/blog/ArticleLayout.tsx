import { useMemo } from 'react'
import { Link } from 'react-router-dom'

interface TOCItem { id: string; text: string; level: number }

interface Props {
  content: string
  prevPost?: { id: number; title: string } | null
  nextPost?: { id: number; title: string } | null
  children: React.ReactNode
}

function extractTOC(md: string): TOCItem[] {
  const items: TOCItem[] = []
  for (const line of md.split('\n')) {
    const m = line.match(/^(#{2,4})\s+(.+)/)
    if (m) {
      const text = m[2].replace(/[`*_~\[\]()#]+/g, '').trim()
      items.push({ id: text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-鿿-]/g, ''), text, level: m[1].length })
    }
  }
  return items
}

export function ArticleLayout({ content, prevPost, nextPost, children }: Props) {
  const toc = useMemo(() => extractTOC(content), [content])

  return (
    <div className="flex justify-center relative">
      {/* Left: article navigation — hover reveal */}
      <div className="sidebar-left fixed left-0 top-1/2 -translate-y-1/2 z-50 flex" style={{ minWidth: 6 }}>
        {/* Hover strip */}
        <div className="w-1.5 bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/50 rounded-r cursor-pointer shrink-0 transition-colors" />
        {/* Panel */}
        <div className="sidebar-panel bg-[var(--color-surface)] border border-[var(--color-border)] rounded-r-lg shadow-lg p-4 w-52 ml-1">
          <h4 className="text-[11px] text-[var(--color-text-muted)] tracking-wider mb-3 uppercase">导航</h4>
          <div className="space-y-3">
            {prevPost ? (
              <Link to={`/blog/${prevPost.id}`} className="block group">
                <span className="text-[10px] text-[var(--color-text-muted)]">← Previous</span>
                <p className="text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors mt-0.5 line-clamp-2">{prevPost.title}</p>
              </Link>
            ) : <p className="text-xs text-[var(--color-text-muted)]">第一篇</p>}
            {nextPost ? (
              <Link to={`/blog/${nextPost.id}`} className="block group">
                <span className="text-[10px] text-[var(--color-text-muted)]">Next →</span>
                <p className="text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors mt-0.5 line-clamp-2">{nextPost.title}</p>
              </Link>
            ) : <p className="text-xs text-[var(--color-text-muted)]">最新一篇</p>}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl w-full">{children}</div>

      {/* Right: TOC — hover reveal */}
      {toc.length > 0 && (
        <div className="sidebar-right fixed right-0 top-1/2 -translate-y-1/2 z-50 flex" style={{ minWidth: 6 }}>
          {/* Panel */}
          <div className="sidebar-panel bg-[var(--color-surface)] border border-[var(--color-border)] rounded-l-lg shadow-lg p-4 w-52 mr-1" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            <h4 className="text-[11px] text-[var(--color-text-muted)] tracking-wider mb-3 uppercase">目录</h4>
            <div className="border-l-2 border-[var(--color-border)] pl-3 space-y-0.5">
              {toc.map((item) => (
                <div
                  key={item.id}
                  onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer transition-colors block py-0.5 truncate"
                  style={{ paddingLeft: (item.level - 2) * 10 }}
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
          {/* Hover strip */}
          <div className="w-1.5 bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/50 rounded-l cursor-pointer shrink-0 transition-colors" />
        </div>
      )}
    </div>
  )
}
