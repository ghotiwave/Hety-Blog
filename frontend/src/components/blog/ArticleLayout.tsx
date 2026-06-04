import { useState, useMemo, useCallback } from 'react'

interface TOCItem {
  id: string
  text: string
  level: number
}

interface Props {
  content: string
  prevPost?: { id: number; title: string } | null
  nextPost?: { id: number; title: string } | null
  children: React.ReactNode
}

function extractTOC(markdown: string): TOCItem[] {
  const items: TOCItem[] = []
  const lines = markdown.split('\n')
  for (const line of lines) {
    const match = line.match(/^(#{2,4})\s+(.+)/)
    if (match) {
      const level = match[1].length
      const text = match[2].replace(/[`*_~\[\]()#]+/g, '').trim()
      const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-鿿-]/g, '')
      items.push({ id, text, level })
    }
  }
  return items
}

export function ArticleLayout({ content, prevPost, nextPost, children }: Props) {
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null)
  const toc = useMemo(() => extractTOC(content), [content])

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="relative max-w-4xl mx-auto flex">
      {/* Left trigger zone */}
      <div
        className="fixed left-0 top-0 w-8 h-full z-40"
        onMouseEnter={() => setHoverZone('left')}
        onMouseLeave={() => setHoverZone(null)}
      />

      {/* Left sidebar - article nav */}
      <aside
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-r-lg shadow-lg transition-all duration-300 ${
          hoverZone === 'left' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
        style={{ maxWidth: 220 }}
      >
        <div className="p-4">
          <h4 className="text-xs text-[var(--color-text-muted)] tracking-wider mb-3">导航</h4>
          {prevPost ? (
            <a href={`/blog/${prevPost.id}`} className="block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-2 transition-colors">
              ← {prevPost.title.slice(0, 20)}...
            </a>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)] mb-2">上一篇</p>
          )}
          {nextPost ? (
            <a href={`/blog/${nextPost.id}`} className="block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
              → {nextPost.title.slice(0, 20)}...
            </a>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">下一篇</p>
          )}
        </div>
      </aside>

      {/* Left visual indicator */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 w-0.5 h-16 bg-[var(--color-border)] rounded-r z-30 opacity-30 hover:opacity-0 transition-opacity" />

      {/* Main content */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* Right trigger zone */}
      <div
        className="fixed right-0 top-0 w-8 h-full z-40"
        onMouseEnter={() => setHoverZone('right')}
        onMouseLeave={() => setHoverZone(null)}
      />

      {/* Right sidebar - TOC */}
      {toc.length > 0 && (
        <aside
          className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-l-lg shadow-lg transition-all duration-300 ${
            hoverZone === 'right' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
          style={{ maxWidth: 240, maxHeight: '70vh', overflowY: 'auto' }}
        >
          <div className="p-4">
            <h4 className="text-xs text-[var(--color-text-muted)] tracking-wider mb-3">目录</h4>
            <nav className="space-y-0.5">
              {toc.map((item) => (
                <div
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer transition-colors truncate"
                  style={{ paddingLeft: (item.level - 2) * 12 }}
                >
                  {item.text}
                </div>
              ))}
            </nav>
          </div>
        </aside>
      )}

      {/* Right visual indicator */}
      {toc.length > 0 && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 w-0.5 h-16 bg-[var(--color-border)] rounded-l z-30 opacity-30 hover:opacity-0 transition-opacity" />
      )}
    </div>
  )
}
