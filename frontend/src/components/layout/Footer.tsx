import { siteConfig } from '@/config'

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)]/50 py-8 mt-auto">
      <div className="max-w-5xl mx-auto px-6 text-center text-xs text-[var(--color-text-muted)]">
        &copy; {new Date().getFullYear()} {siteConfig.shortName}
      </div>
    </footer>
  )
}
