import { useState, useEffect } from 'react'
import api from '@/services/api'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import { siteConfig } from '@/config'
import logoImg from '@/assets/logo.png'

export function About() {
  const [aboutPage, setAboutPage] = useState('')
  const [profile, setProfile] = useState<any>({})

  useEffect(() => {
    api.get('/profile').then((res) => {
      setAboutPage(res.data.about_page || '')
      setProfile(res.data)
    }).catch(() => {})
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
      {aboutPage ? (
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
