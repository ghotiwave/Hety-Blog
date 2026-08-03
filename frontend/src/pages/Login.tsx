import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AuthShell } from '@/components/auth/AuthShell'
import { GitHubAuthLink } from '@/components/auth/GitHubAuthLink'
import api from '@/services/api'

const oauthErrors: Record<string, string> = {
  cancelled: '已取消 GitHub 授权。',
  existing_email: '该 GitHub 邮箱已注册。请先使用原账号登录，再到个人资料中绑定 GitHub。',
  no_verified_email: 'GitHub 账号没有可用的已验证邮箱。',
  invalid_state: 'GitHub 登录请求已过期，请重新尝试。',
  missing_code: 'GitHub 没有返回授权码，请重新尝试。',
  provider_error: 'GitHub 登录服务暂时不可用，请稍后重试。',
  missing_token: 'GitHub 登录结果无效，请重新尝试。',
  session_error: '登录会话建立失败，请重新尝试。',
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => {
    const oauthError = searchParams.get('oauth_error')
    return oauthError ? oauthErrors[oauthError] || oauthErrors.provider_error : ''
  })
  const [loading, setLoading] = useState(false)
  const [githubEnabled, setGithubEnabled] = useState(false)

  useEffect(() => {
    api.get('/auth/config')
      .then((response) => setGithubEnabled(Boolean(response.data.github_oauth_enabled)))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(identifier, password)
      navigate('/')
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail
        if (typeof detail === 'string') {
          setError(detail)
        } else if (error.response?.status === 401) {
          setError('用户名、邮箱或密码错误')
        } else {
          setError('登录服务暂时不可用，请稍后重试')
        }
      } else {
        setError('登录服务暂时不可用，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell mode="login" title="登录" description="使用用户名或邮箱继续访问你的个人空间。">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              name="username"
              autoComplete="username"
              placeholder="用户名或邮箱"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              maxLength={100}
              required
            />
            <Input type="password" autoComplete="current-password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required />
            {error && <p role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
            {githubEnabled && (
              <GitHubAuthLink mode="login" />
            )}
          </form>
    </AuthShell>
  )
}
