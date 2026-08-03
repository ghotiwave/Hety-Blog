import { useState, useEffect } from 'react'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { GitHubIcon } from '@/components/auth/GitHubIcon'

const githubResultMessages: Record<string, string> = {
  account_conflict: '这个 GitHub 账号已经绑定到其他用户。',
  already_bound: '当前账号已经绑定了另一个 GitHub 账号。',
  bind_session_expired: '绑定请求已过期，请重新尝试。',
  invalid_state: '绑定请求已过期，请重新尝试。',
  cancelled: '已取消 GitHub 授权。',
}

function initialGitHubMessage() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('github') === 'linked') return 'GitHub 账号绑定成功'
  const oauthError = params.get('oauth_error')
  return oauthError ? githubResultMessages[oauthError] || 'GitHub 绑定失败，请稍后重试。' : ''
}

export function UserProfile() {
  const { refreshUser } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState('')
  const [signature, setSignature] = useState('')
  const [msg, setMsg] = useState(initialGitHubMessage)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [githubEnabled, setGithubEnabled] = useState(false)
  const [githubLinked, setGithubLinked] = useState(false)
  const [githubLogin, setGithubLogin] = useState('')
  const [githubLoading, setGithubLoading] = useState(false)

  useEffect(() => {
    api.get('/user/profile').then((res) => {
      setAvatarUrl(res.data.avatar_url || '')
      setSignature(res.data.signature || '')
      setGithubLinked(Boolean(res.data.github_linked))
      setGithubLogin(res.data.github_login || '')
    })
    api.get('/auth/config')
      .then((res) => setGithubEnabled(Boolean(res.data.github_oauth_enabled)))
      .catch(() => {})
    const params = new URLSearchParams(window.location.search)
    if (params.has('github') || params.has('oauth_error')) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const handleGitHubBind = async () => {
    setGithubLoading(true)
    setMsg('')
    try {
      const res = await api.post('/auth/github/bind')
      window.location.assign(res.data.authorization_url)
    } catch {
      setMsg('无法开始 GitHub 绑定，请稍后重试。')
      setGithubLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post('/admin/upload', form)
      setAvatarUrl(res.data.url)
    } catch {
      setMsg('图片上传失败，请重试')
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/user/profile', { avatar_url: avatarUrl, signature })
      await refreshUser()
      setMsg('保存成功')
      setTimeout(() => setMsg(''), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-4 sm:py-8">
      <header className="mb-7 border-b border-[var(--color-border)] pb-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-primary)]">ACCOUNT / PROFILE</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)]">个人资料</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">头像和个性签名会显示在你的评论旁。</p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 sm:p-7">
        {/* Avatar */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] tracking-wider mb-2 block">头像</label>
          <div className="flex flex-wrap items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover border border-[var(--color-border)]" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] text-xs">无</div>
            )}
            <label className="px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-xs cursor-pointer hover:border-[var(--color-primary)] transition-colors text-[var(--color-text-muted)]">
              {imageUploading ? '上传中...' : '更换头像'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Signature */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] tracking-wider mb-2 block">个性签名</label>
          <Textarea
            placeholder="写一句话介绍自己...（支持 Markdown）"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className="min-h-[80px]"
            maxLength={200}
          />
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1 flex justify-between">
            <span>支持 Markdown / 表情</span>
            <span>{signature.length}/200</span>
          </p>
          {signature && (
            <div className="mt-2 p-3 rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-surface)]/30 text-sm text-[var(--color-text)] prose max-w-none prose-a:text-[var(--color-primary)]">
              <MarkdownRenderer>
                {signature}
              </MarkdownRenderer>
            </div>
          )}
        </div>

        {githubEnabled && (
          <div className="border-t border-[var(--color-border)] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                  <GitHubIcon />
                  GitHub 账号
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {githubLinked ? `已绑定${githubLogin ? ` @${githubLogin}` : ''}` : '绑定后可以使用 GitHub 快速登录。'}
                </p>
              </div>
              {!githubLinked && (
                <Button type="button" variant="secondary" onClick={handleGitHubBind} disabled={githubLoading}>
                  {githubLoading ? '正在跳转…' : '绑定 GitHub'}
                </Button>
              )}
            </div>
          </div>
        )}

        {msg && <p role="status" className="text-sm text-[var(--color-primary)]">{msg}</p>}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? '保存中...' : '保存'}
        </Button>
      </form>
    </div>
  )
}
