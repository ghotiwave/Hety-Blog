import { useState, useMemo, useCallback } from 'react'

interface TOCItem { id: string; text: string; level: number }

interface Props {
  content: string
  prevPost?: { id: number; title: string } | null
  nextPost?: { id: number; title: string } | null
  children: React.ReactNode
}

function extractTOC(markdown: string): TOCItem[] {
  const items: TOCItem[] = []
  for (const line of markdown.split('\n')) {
    const m = line.match(/^(#{2,4})\s+(.+)/)
    if (m) {
      const text = m[2].replace(/[`*_~\[\]()#]+/g, '').trim()
      items.push({ id: text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-鿿-]/g, ''), text, level: m[1].length })
    }
  }
  return items
}

export function ArticleLayout({ content, prevPost, nextPost, children }: Props) {
  const [expanded, setExpanded] = useState<'left' | 'right' | null>(null)
  const toc = useMemo(() => extractTOC(content), [content])
  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="relative max-w-3xl mx-auto">
      {/* Left sidebar */}
      <div
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex transition-transform duration-300"
        style={{ transform: expanded === 'left' ? 'translateX(0)' : 'translateX(calc(-100% + 6px))' }}
        onMouseEnter={() => setExpanded('left')}
        onMouseLeave={() => setExpanded(null)}
      >
        {/* Visible tab */}
        <div className="w-1.5 bg-[var(--color-primary)]/30 rounded-r cursor-pointer hover:bg-[var(--color-primary)]/60 transition-colors shrink-0" />
        {/* Content */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-r-lg shadow-lg p-3 w-48">
          <h4 className="text-[11px] text-[var(--color-text-muted)] tracking-wider mb-2">导航</h4>
          {prevPost ? (
            <a href={`/blog/${prevPost.id}`} className="block text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-1.5 transition-colors truncate">
              ← {prevPost.title}
            </a>
          ) : <p className="text-xs text-[var(--color-text-muted)] mb-1.5">—</p>}
          {nextPost ? (
            <a href={`/blog/${nextPost.id}`} className="block text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors truncate">
              → {nextPost.title}
            </a>
          ) : <p className="text-xs text-[var(--color-text-muted)]">—</p>}
        </div>
      </div>

      {/* Main content */}
      {children}

      {/* Right sidebar - TOC */}
      {toc.length > 0 && (
        <div
          className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex transition-transform duration-300"
          style={{ transform: expanded === 'right' ? 'translateX(0)' : 'translateX(calc(100% - 6px))' }}
          onMouseEnter={() => setExpanded('right')}
          onMouseLeave={() => setExpanded(null)}
        >
          {/* Content */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-l-lg shadow-lg p-3 w-52" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <h4 className="text-[11px] text-[var(--color-text-muted)] tracking-wider mb-2">目录</h4>
            {toc.map((item) => (
              <div key={item.id} onClick={() => scrollTo(item.id)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer transition-colors truncate block py-0.5"
                style={{ paddingLeft: (item.level - 2) * 12 }}>
                {item.text}
              </div>
            ))}
          </div>
          {/* Visible tab */}
          <div className="w-1.5 bg-[var(--color-primary)]/30 rounded-l cursor-pointer hover:bg-[var(--color-primary)]/60 transition-colors shrink-0" />
        </div>
      )}
    </div>
  )
}
