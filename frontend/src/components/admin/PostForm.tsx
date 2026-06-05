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
  const [postType, setPostType] = useState((post as any)?.post_type ?? 'blog')
  const [published, setPublished] = useState(post?.published ?? false)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [contentImageUploading, setContentImageUploading] = useState(false)
  const [preview, setPreview] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json()
      setCoverImage(data.url)
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { title, content, summary, tags, post_type: postType, cover_image: coverImage, published }
      if (post?.id) {
        await api.put(`/admin/posts/${post.id}`, payload)
      } else {
        await api.post('/admin/posts', payload)
      }
      navigate('/admin/posts')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      <Input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <Input
        placeholder="Summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <Input
        placeholder="Tags (comma-separated, e.g. #tech,#aigc,#python)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" value="blog" checked={postType === 'blog'} onChange={() => setPostType('blog')} /> Blog
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" value="note" checked={postType === 'note'} onChange={() => setPostType('note')} /> Note
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
        <div className="flex gap-2">
          <Input
            placeholder="Image URL or upload"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
          />
          <label className="px-4 py-2 bg-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-300">
            {imageUploading ? 'Uploading...' : 'Upload'}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
        {coverImage && (
          <img src={coverImage} alt="preview" className="mt-2 h-24 rounded object-cover" />
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Content</label>
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
              placeholder="Content (Markdown supported)"
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
                  const file = e.target.files?.[0]; if (!file) return
                  setContentImageUploading(true)
                  const form = new FormData(); form.append('file', file)
                  try {
                    const token = localStorage.getItem('token')
                    const res = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
                    const data = await res.json()
                    if (data.url) {
                      const el = document.getElementById('post-content-textarea') as HTMLTextAreaElement | null
                      const md = `![](${data.url})`
                      if (el) {
                        const s = el.selectionStart; const e = el.selectionEnd
                        setContent(content.slice(0, s) + md + content.slice(e))
                      } else {
                        setContent((prev) => prev + '\n' + md + '\n')
                      }
                    }
                  } finally { setContentImageUploading(false) }
                }} className="hidden" />
              </label>
              <span>支持 Markdown / 图片 / 表情</span>
            </div>
          </>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="rounded"
        />
        Publish
      </label>
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : post ? 'Update Post' : 'Create Post'}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/admin/posts')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
