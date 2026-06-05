import { useState, useEffect } from 'react'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

export function UserProfile() {
  const { user, setUser } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState('')
  const [signature, setSignature] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)

  useEffect(() => {
    api.get('/user/profile').then((res) => {
      setAvatarUrl(res.data.avatar_url || '')
      setSignature(res.data.signature || '')
    })
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: form,
      })
      const data = await res.json()
      setAvatarUrl(data.url)
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/user/profile', { avatar_url: avatarUrl, signature })
      setMsg('保存成功')
      setTimeout(() => setMsg(''), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto pt-8">
      <h1 className="text-2xl text-[var(--color-text)] mb-8 font-light tracking-wide">个人资料</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Avatar */}
        <div>
          <label className="text-xs text-[var(--color-text-muted)] tracking-wider mb-2 block">头像</label>
          <div className="flex items-center gap-4">
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

        {msg && <p className="text-sm text-green-600">{msg}</p>}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? '保存中...' : '保存'}
        </Button>
      </form>
    </div>
  )
}
