import { Link } from 'react-router-dom'

interface AuthShellProps {
  mode: 'login' | 'register'
  title: string
  description: string
  children: React.ReactNode
}

const copy = {
  login: {
    code: 'AUTH / 01',
    status: 'IDENTITY REQUIRED',
    detail: '登录后可同步评论、收藏与阅读记录。',
    alternate: '还没有账号？',
    action: '创建账号',
    href: '/register',
  },
  register: {
    code: 'AUTH / 02',
    status: 'NEW IDENTITY',
    detail: '邮箱只用于验证身份，不会显示在公开页面。',
    alternate: '已经有账号？',
    action: '返回登录',
    href: '/login',
  },
}

export function AuthShell({ mode, title, description, children }: AuthShellProps) {
  const content = copy[mode]
  return (
    <section className="mx-auto w-full max-w-3xl py-6 sm:py-12">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[0_24px_80px_rgba(25,45,90,0.08)] dark:shadow-none md:grid md:grid-cols-[0.78fr_1.22fr]">
        <aside className="relative overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:border-b-0 md:border-r md:p-8">
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative flex h-full min-h-32 flex-col justify-between gap-8 md:min-h-96">
            <div>
              <p className="font-mono text-[11px] tracking-[0.22em] text-[var(--color-primary)]">{content.code}</p>
              <div className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] tracking-wider text-[var(--color-text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
                {content.status}
              </div>
            </div>
            <p className="max-w-52 text-sm leading-7 text-[var(--color-text-muted)]">{content.detail}</p>
          </div>
        </aside>

        <div className="p-6 sm:p-8 md:p-10">
          <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-text-muted)]">HETY BLOG / SECURE SESSION</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">{description}</p>
          <div className="mt-7">{children}</div>
          <p className="mt-6 text-sm text-[var(--color-text-muted)]">
            {content.alternate}{' '}
            <Link to={content.href} className="font-medium text-[var(--color-primary)] hover:underline">
              {content.action}
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
