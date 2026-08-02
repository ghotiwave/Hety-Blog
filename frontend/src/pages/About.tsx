import { useState, useEffect } from 'react'
import api from '@/services/api'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import { siteConfig } from '@/config'
import logoImg from '@/assets/logo.png'

export function About() {
  const [aboutPage, setAboutPage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    api.get('/profile').then((res) => {
      if (active) setAboutPage(res.data.about_page || '')
    }).catch(() => {
      if (active) setError(true)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <img src={logoImg} alt="" className="w-16 h-16 object-contain rounded-xl mx-auto mb-4 opacity-80" />
        <h1 className="text-2xl text-[var(--color-text)] font-light tracking-wide mb-2">关于本站</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{siteConfig.description}</p>
      </div>

      {/* Main content */}
      {loading ? (
        <div role="status" className="rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/30 p-8 text-center text-sm text-[var(--color-text-muted)]">
          正在加载介绍…
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/5 p-8 text-center text-sm text-red-600 dark:text-red-300">
          关于页加载失败，请稍后刷新重试
        </div>
      ) : aboutPage ? (
        <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border)]/50 rounded-xl p-6 md:p-8">
          <div className="text-sm text-[var(--color-text)] leading-loose prose max-w-none prose-a:text-[var(--color-primary)] prose-ul:list-disc prose-ul:list-inside prose-ul:space-y-1.5 prose-li:text-[var(--color-text-muted)]">
            <MarkdownRenderer>{aboutPage}</MarkdownRenderer>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)]/30 border border-[var(--color-border)]/50 rounded-xl p-6 md:p-8">
          <div className="text-sm text-[var(--color-text)] leading-loose text-center text-[var(--color-text-muted)]">
            站长还没写介绍，先去逛逛别的页面吧
          </div>
        </div>
      )}

      {/* Tech stack badges */}
      <div className="flex flex-wrap justify-center gap-2 mt-8">
        {['React','FastAPI','SQLite','Docker','Quartz','Obsidian','DeepSeek'].map((tech) => (
          <span key={tech} className="text-[10px] px-3 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)]">
            {tech}
          </span>
        ))}
      </div>
    </div>
  )
}
