import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { EmojiPicker } from '@/components/blog/EmojiPicker'
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer'

interface Props {
  post?: {
    id: number
    title: string
    content: string
    summary: string | null
    cover_image: string | null
    tags: string | null
    post_type?: string
    published: boolean
  }
}

export function PostForm({ post }: Props) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(post?.title ?? '')
  const [content, setContent] = useState(post?.content ?? '')
  const [summary, setSummary] = useState(post?.summary ?? '')
  const [coverImage, setCoverImage] = useState(post?.cover_image ?? '')
  const [tags, setTags] = useState(post?.tags ?? '')
  const [postType] = useState(post?.post_type ?? 'blog')
  const [published, setPublished] = useState(post?.published ?? false)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [contentImageUploading, setContentImageUploading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [formError, setFormError] = useState('')

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImageUploading(true)
    setFormError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post('/admin/upload', form)
      setCoverImage(res.data.url)
    } catch {
      setFormError('封面上传失败，请检查文件格式和大小后重试。')
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = { title, content, summary, tags, post_type: postType, cover_image: coverImage, published }
      if (post?.id) {
        await api.put(`/admin/posts/${post.id}`, payload)
      } else {
        await api.post('/admin/posts', payload)
      }
      navigate('/admin/posts')
    } catch {
      setFormError('文章保存失败，请检查字段内容后重试。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
      <Input
        placeholder="标题"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <Input
        placeholder="摘要"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <Input
        placeholder="标签（用逗号分隔，如 #技术,#AI,#Python）"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">封面图片</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="图片链接或上传"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
          />
          <label className="px-4 py-2 bg-[var(--color-border)] rounded-lg text-sm cursor-pointer hover:bg-[var(--color-text-muted)] text-[var(--color-text)]">
            {imageUploading ? '上传中...' : '上传'}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
        {coverImage && (
          <img src={coverImage} alt="preview" className="mt-2 h-24 rounded object-cover" />
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-[var(--color-text)]">正文</label>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className={`text-xs px-3 py-1 rounded cursor-pointer transition-colors ${preview ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'}`}
          >
            {preview ? '✏️ 编辑' : '👁 预览'}
          </button>
        </div>
        {preview ? (
          <div className="min-h-[300px] p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/30 prose max-w-none prose-a:text-[var(--color-primary)]">
            {content ? (
              <MarkdownRenderer>
                {content}
              </MarkdownRenderer>
            ) : (
              <p className="text-[var(--color-text-muted)] text-sm italic">暂无内容</p>
            )}
          </div>
        ) : (
          <>
            <Textarea
              placeholder="正文（支持 Markdown）"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px]"
              id="post-content-textarea"
              required
            />
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mt-2">
              <EmojiPicker onSelect={(text) => {
                const el = document.getElementById('post-content-textarea') as HTMLTextAreaElement | null
                if (el) {
                  const s = el.selectionStart; const e = el.selectionEnd
                  setContent(content.slice(0, s) + text + content.slice(e))
                  requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + text.length, s + text.length) })
                } else {
                  setContent((prev) => prev + text)
                }
              }} />
              <label className={`cursor-pointer hover:text-[var(--color-primary)] transition-colors ${contentImageUploading ? 'opacity-50' : ''}`}>
                {contentImageUploading ? '⏳ 上传中...' : '🖼️ 插入图片'}
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  setContentImageUploading(true)
                  setFormError('')
                  const form = new FormData(); form.append('file', file)
                  try {
                    const res = await api.post('/admin/upload', form)
                    if (res.data.url) {
                      const el = document.getElementById('post-content-textarea') as HTMLTextAreaElement | null
                      const md = `![](${res.data.url})`
                      if (el) {
                        const s = el.selectionStart; const e = el.selectionEnd
                        setContent(content.slice(0, s) + md + content.slice(e))
                      } else {
                        setContent((prev) => prev + '\n' + md + '\n')
                      }
                    }
                  } catch {
                    setFormError('正文图片上传失败，请检查文件格式和大小后重试。')
                  } finally { setContentImageUploading(false) }
                }} disabled={contentImageUploading} className="hidden" />
              </label>
              <span>支持 Markdown / 图片 / 表情</span>
            </div>
          </>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="rounded"
        />
        发布
      </label>
      {formError && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{formError}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? '保存中...' : post ? '更新文章' : '创建文章'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => navigate('/admin/posts')}>
          取消
        </Button>
      </div>
    </form>
  )
}
