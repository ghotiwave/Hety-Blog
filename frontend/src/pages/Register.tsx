import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

const TURNSTILE_SITE_KEY = ''

declare global {
  interface Window { turnstile: any }
}

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
  const turnstileRef = useRef<string | null>(null)
  const turnstileDivRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (TURNSTILE_SITE_KEY && turnstileDivRef.current && window.turnstile) {
      window.turnstile.render(turnstileDivRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => { turnstileRef.current = token },
      })
    }
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
    } catch (err: any) {
      setError(err?.response?.data?.detail || '发送验证码失败')
    } finally {
      setCodeSending(false)
    }
  }, [email, sendCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (TURNSTILE_SITE_KEY && !turnstileRef.current) {
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
      await register(username, email, password, code, turnstileRef.current || undefined)
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.detail || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-12">
      <Card>
        <CardContent>
          <h1 className="text-2xl font-bold text-center mb-6 text-[var(--color-text)]">注册</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="用户名（1-20位）" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} required />
            <div className="flex gap-2">
              <Input type="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" required />
              <Button type="button" variant="secondary" onClick={handleSendCode} disabled={codeSending || countdown > 0} className="shrink-0">
                {countdown > 0 ? `${countdown}s` : codeSending ? '发送中...' : '获取验证码'}
              </Button>
            </div>
            <Input placeholder="验证码" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
            <Input type="password" placeholder="密码（4-12位，不含中文）" value={password} onChange={(e) => setPassword(e.target.value)} minLength={4} maxLength={12} required />
            {TURNSTILE_SITE_KEY && <div ref={turnstileDivRef} className="flex justify-center" />}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '注册中...' : '注册'}
            </Button>
          </form>
          <p className="text-sm text-center text-[var(--color-text-muted)] mt-4">
            已有账号？ <Link to="/login" className="text-[#8b7355] hover:underline">登录</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
