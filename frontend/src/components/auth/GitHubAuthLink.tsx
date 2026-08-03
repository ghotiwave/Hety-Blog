import { GitHubIcon } from '@/components/auth/GitHubIcon'

interface GitHubAuthLinkProps {
  mode: 'login' | 'register'
}

export function GitHubAuthLink({ mode }: GitHubAuthLinkProps) {
  const action = mode === 'register' ? '注册' : '登录'

  return (
    <>
      <div className="flex items-center gap-3 py-1 text-[10px] tracking-[0.14em] text-[var(--color-text-muted)]">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        OR
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
      <a
        href="/api/auth/github/start"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-bg)]"
      >
        <GitHubIcon />
        使用 GitHub {action}
      </a>
    </>
  )
}
