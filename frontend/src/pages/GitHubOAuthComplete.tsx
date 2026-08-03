import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'


export function GitHubOAuthComplete() {
  const { completeOAuthLogin } = useAuth()
  const navigate = useNavigate()
  const handled = useRef(false)
  const [message, setMessage] = useState('正在建立安全会话…')

  useEffect(() => {
    if (handled.current) return
    handled.current = true
    const params = new URLSearchParams(window.location.hash.slice(1))
    const token = params.get('token')
    window.history.replaceState(null, '', window.location.pathname)
    if (!token) {
      navigate('/login?oauth_error=missing_token', { replace: true })
      return
    }
    completeOAuthLogin(token)
      .then(() => navigate('/blog', { replace: true }))
      .catch(() => {
        setMessage('GitHub 登录会话无效，正在返回登录页…')
        navigate('/login?oauth_error=session_error', { replace: true })
      })
  }, [completeOAuthLogin, navigate])

  return (
    <div className="mx-auto flex min-h-56 max-w-md items-center justify-center py-12" role="status">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-8 text-center">
        <span className="mx-auto block h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
        <p className="mt-4 font-mono text-xs tracking-[0.12em] text-[var(--color-text-muted)]">{message}</p>
      </div>
    </div>
  )
}
