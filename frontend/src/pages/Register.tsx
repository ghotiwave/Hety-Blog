import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

const TURNSTILE_SITE_KEY = '' // Fill after getting from Cloudflare

declare global {
  interface Window { turnstile: any }
}

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyUrl, setVerifyUrl] = useState('')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (TURNSTILE_SITE_KEY && !turnstileRef.current) {
      setError('请完成人机验证')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await register(username, email, password, turnstileRef.current || undefined)
      if (result?.verify_url) setVerifyUrl(result.verify_url)
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
            <Input type="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="密码（4-12位，不含中文）" value={password} onChange={(e) => setPassword(e.target.value)} minLength={4} maxLength={12} required />
            {TURNSTILE_SITE_KEY && <div ref={turnstileDivRef} className="flex justify-center" />}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {verifyUrl && (
              <p className="text-xs text-green-600 bg-green-50 p-2 rounded">
                注册成功！验证链接已发送到你的邮箱。<br />
                如未收到，点击：<a href={verifyUrl} target="_blank" className="underline break-all">{verifyUrl}</a>
              </p>
            )}
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
