import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AuthShell } from '@/components/auth/AuthShell'
import api from '@/services/api'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'

export function Register() {
  const { register, sendCode } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [codeSending, setCodeSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileVersion, setTurnstileVersion] = useState(0)

  useEffect(() => {
    api.get('/auth/config').then((response) => {
      setTurnstileSiteKey(response.data.turnstile_site_key || '')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendCode = useCallback(async () => {
    if (!email || !email.includes('@')) {
      setError('请先填写有效的邮箱地址')
      return
    }
    setError('')
    setCodeSending(true)
    try {
      await sendCode(email)
      setCountdown(60)
    } catch (error: unknown) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
      setError(typeof detail === 'string' ? detail : '发送验证码失败')
    } finally {
      setCodeSending(false)
    }
  }, [email, sendCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (turnstileSiteKey && !turnstileToken) {
      setError('请完成人机验证')
      return
    }
    if (!code) {
      setError('请输入验证码')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register(username, email, password, code, turnstileToken || undefined)
      navigate('/')
    } catch (error: unknown) {
      if (turnstileSiteKey) {
        setTurnstileToken('')
        setTurnstileVersion((version) => version + 1)
      }
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
      setError(typeof detail === 'string' ? detail : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell mode="register" title="创建账号" description="完成邮箱验证后即可参与评论并保存阅读记录。">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input autoComplete="username" placeholder="用户名（1-20位）" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} required />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input type="email" autoComplete="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={100} className="flex-1" required />
              <Button type="button" variant="secondary" onClick={handleSendCode} disabled={codeSending || countdown > 0} className="shrink-0">
                {countdown > 0 ? `${countdown}s` : codeSending ? '发送中...' : '获取验证码'}
              </Button>
            </div>
            <Input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" placeholder="验证码" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
            <Input type="password" autoComplete="new-password" placeholder="密码（至少 8 位）" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} required />
            {turnstileSiteKey && (
              <TurnstileWidget
                key={turnstileVersion}
                siteKey={turnstileSiteKey}
                onTokenChange={setTurnstileToken}
                onError={() => setError('人机验证组件加载失败，请刷新页面重试')}
              />
            )}
            {error && <p role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '注册中...' : '注册'}
            </Button>
          </form>
    </AuthShell>
  )
}
