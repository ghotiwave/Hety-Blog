import { useState, useEffect } from 'react'
import api from '@/services/api'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'
import { EmojiPicker } from '@/components/blog/EmojiPicker'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

// 个人资料的 头像/简介/社交 等字段已迁到独立主页(Hety-Home)管理；
// 这里只保留「关于页面」内容(About 页用的 about_page)。后端 PUT 是 exclude_unset 局部更新，
// 只提交 about_page，其它字段不受影响。
export function ProfileEdit() {
  const [aboutPage, setAboutPage] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api.get('/admin/profile').then((res) => {
      setAboutPage(res.data.about_page || '')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await api.put('/admin/profile', { about_page: aboutPage })
    setSaving(false)
    setMsg('保存成功')
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">关于页面</h1>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div>
          <label className="text-sm font-medium text-[var(--color-text)] block mb-2">「关于本站」内容（支持 Markdown）</label>
          <Textarea
            id="about-page-textarea"
            placeholder="编辑「关于本站」页面内容"
            value={aboutPage}
            onChange={(e) => setAboutPage(e.target.value)}
            className="min-h-[300px]"
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
