import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ArticleNavItem } from '@/services/articleNavigation'
import { extractTOC } from '@/services/articleToc'

interface Props {
  content: string
  navItems: ArticleNavItem[]
  currentId: number
  navBasePath: '/blog' | '/digest'
  navTitle: string
  children: React.ReactNode
}

export function ArticleLayout({ content, navItems, currentId, navBasePath, navTitle, children }: Props) {
  const toc = useMemo(() => extractTOC(content), [content])
  const tocTrackRef = useRef<HTMLDivElement>(null)
  const [activeHeading, setActiveHeading] = useState('')
  const [progressTop, setProgressTop] = useState(0)

  useEffect(() => {
    let frame = 0
    const updateReadingPosition = () => {
      frame = 0
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0
      const trackHeight = tocTrackRef.current?.clientHeight ?? 0
      setProgressTop(progress * Math.max(0, trackHeight - 40))

      let current = toc[0]?.id ?? ''
      for (const item of toc) {
        const heading = document.getElementById(item.id)
        if (heading && heading.getBoundingClientRect().top <= 160) current = item.id
        else if (heading) break
      }
      setActiveHeading(current)
    }
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateReadingPosition)
    }

    updateReadingPosition()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [toc])

  return (
    <div className="min-[1220px]:grid min-[1220px]:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] max-w-[84rem] mx-auto">
      {/* MkDocs/Zensical-style collection navigation. */}
      <aside className="hidden min-[1220px]:block sticky top-24 h-fit py-6 pr-6">
        <nav className="max-h-[calc(100vh-8rem)] overflow-y-auto pr-2" aria-label={navTitle}>
          <h4 className="text-[11px] text-[var(--color-text-muted)] tracking-[0.18em] mb-4 uppercase">{navTitle}</h4>
          <div className="space-y-0.5 border-l border-[var(--color-border)]">
            {navItems.map((item) => {
              const active = item.id === currentId
              return (
                <Link
                  key={item.id}
                  to={`${navBasePath}/${item.slug || item.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`block -ml-px border-l-2 py-1.5 pl-4 pr-2 text-[13px] leading-5 transition-colors ${
                    active
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-accent)]/45 font-medium'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
                  }`}
                >
                  {item.title}
                </Link>
              )
            })}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="min-w-0 min-[1220px]:px-7">{children}</div>

      {/* Right: current document table of contents. */}
      {toc.length > 0 && (
        <aside className="hidden min-[1220px]:block sticky top-24 h-fit py-6 pl-6" style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}>
          <div>
            <h4 className="text-xs text-[var(--color-text-muted)] tracking-[0.18em] mb-4 uppercase">本页目录</h4>
            <div ref={tocTrackRef} className="relative border-l border-[var(--color-border)] space-y-0.5">
              <span
                aria-hidden="true"
                className="absolute -left-px top-0 h-10 w-0.5 rounded-full bg-[var(--color-primary)] transition-transform duration-150 motion-reduce:transition-none"
                style={{ transform: `translateY(${progressTop}px)` }}
              />
              {toc.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className={`w-full text-left text-sm leading-6 hover:text-[var(--color-primary)] cursor-pointer transition-colors block py-1.5 pr-2 ${
                    activeHeading === item.id ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-muted)]'
                  }`}
                  style={{ paddingLeft: 16 + (item.level - 1) * 12 }}
                >
                  {item.text}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
