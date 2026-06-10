import { useState, useEffect } from 'react'
import api from '@/services/api'
import { Input } from '@/components/ui/Input'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import { EmojiPicker } from '@/components/blog/EmojiPicker'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

export function ProfileEdit() {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState('')
  const [experience, setExperience] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [qq, setQq] = useState('')
  const [douyin, setDouyin] = useState('')
  const [aboutPage, setAboutPage] = useState('')
  const [emailPublic, setEmailPublic] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api.get('/admin/profile').then((res) => {
      const p = res.data
      setName(p.name || '')
      setBio(p.bio || '')
      setInterests(p.interests || '')
      setExperience(p.experience || '')
      setGithubUrl(p.github_url || '')
      setTwitterUrl(p.twitter_url || '')
      setQq(p.qq || '')
      setDouyin(p.douyin || '')
      setAboutPage(p.about_page || '')
      setEmailPublic(p.email_public || '')
      setAvatarUrl(p.avatar_url || '')
    })
  }, [])

  const insertAtCursor = (text: string) => {
    const el = document.getElementById('about-page-textarea') as HTMLTextAreaElement | null
    if (el) {
      const s = el.selectionStart; const e = el.selectionEnd
      setAboutPage(aboutPage.slice(0, s) + text + aboutPage.slice(e))
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + text.length, s + text.length) })
    } else {
      setAboutPage((prev) => prev + text)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const form = new FormData(); form.append('file', file)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      const data = await res.json()
      if (data.url) insertAtCursor(`![](${data.url})`)
    } finally { setUploading(false) }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const form = new FormData(); form.append('file', file)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      const data = await res.json()
      if (data.url) setAvatarUrl(data.url)
    } finally { setUploading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await api.put('/admin/profile', { name, bio, interests, experience, github_url: githubUrl, twitter_url: twitterUrl, qq, douyin, about_page: aboutPage, email_public: emailPublic, avatar_url: avatarUrl })
    setSaving(false)
    setMsg('保存成功')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">个人资料</h1>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {/* Avatar upload */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-[var(--color-text-muted)]">?</div>
            )}
          </div>
          <label className={`cursor-pointer text-sm text-[var(--color-primary)] hover:underline ${uploading ? 'opacity-50' : ''}`}>
            {uploading ? '上传中...' : '更换头像'}
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </label>
        </div>

        <Input placeholder="姓名" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea placeholder="个人简介（支持 Markdown）" value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[100px]" />
        {bio && (
          <div className="p-3 rounded border border-[var(--color-border)]/50 bg-[var(--color-surface)]/30 text-sm prose max-w-none prose-a:text-[var(--color-primary)]">
            <MarkdownRenderer>{bio}</MarkdownRenderer>
          </div>
        )}
        <Input placeholder="兴趣爱好（用逗号分隔）" value={interests} onChange={(e) => setInterests(e.target.value)} />
        <Textarea placeholder="经历（支持 Markdown）" value={experience} onChange={(e) => setExperience(e.target.value)} className="min-h-[100px]" />
        {experience && (
          <div className="p-3 rounded border border-[var(--color-border)]/50 bg-[var(--color-surface)]/30 text-sm prose max-w-none prose-a:text-[var(--color-primary)]">
            <MarkdownRenderer>{experience}</MarkdownRenderer>
          </div>
        )}
        <Input placeholder="GitHub 链接" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
        <Input placeholder="Twitter 链接" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} />
        <Input placeholder="QQ 号" value={qq} onChange={(e) => setQq(e.target.value)} />
        <Input placeholder="抖音号" value={douyin} onChange={(e) => setDouyin(e.target.value)} />
        <Input placeholder="公开邮箱（展示在首页）" value={emailPublic} onChange={(e) => setEmailPublic(e.target.value)} />

        {/* About page editor */}
        <div className="border-t border-[var(--color-border)] pt-4">
          <label className="text-sm font-medium text-[var(--color-text)] block mb-2">关于页面</label>
          <Textarea
            id="about-page-textarea"
            placeholder="编辑「关于本站」页面内容（支持 Markdown）"
            value={aboutPage}
            onChange={(e) => setAboutPage(e.target.value)}
            className="min-h-[200px]"
          />
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mt-2">
            <EmojiPicker onSelect={(text) => insertAtCursor(text)} />
            <label className={`cursor-pointer hover:text-[var(--color-primary)] transition-colors ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ 上传中...' : '🖼️ 插入图片'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            <span>支持 Markdown / 图片 / 表情</span>
          </div>
          {aboutPage && (
            <div className="mt-3 p-4 rounded border border-[var(--color-border)]/50 bg-[var(--color-surface)]/30 text-sm prose max-w-none prose-a:text-[var(--color-primary)]">
              <MarkdownRenderer>{aboutPage}</MarkdownRenderer>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          {msg && <span className="text-sm text-green-500">{msg}</span>}
        </div>
      </form>
    </div>
  )
}
