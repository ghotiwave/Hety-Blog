import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import api from '@/services/api'
import { PostTable } from '@/components/admin/PostTable'
import { Button } from '@/components/ui/Button'

interface ManagedPost {
  id: number
  title: string
  published: boolean
  created_at: string
  comment_count: number
}

export function PostManage() {
  const [posts, setPosts] = useState<ManagedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchPosts = async () => {
    try {
      const res = await api.get('/admin/posts', { params: { page_size: 50 } })
      setPosts(res.data.items)
    } catch {
      setNotice({ type: 'error', text: '文章列表加载失败，请重试' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    api.get('/admin/posts', { params: { page_size: 50 }, signal: controller.signal })
      .then((res) => setPosts(res.data.items))
      .catch((error) => {
        if (!axios.isCancel(error)) setNotice({ type: 'error', text: '文章列表加载失败，请重试' })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这篇文章？')) return
    setNotice(null)
    try {
      await api.delete(`/admin/posts/${id}`)
      setNotice({ type: 'success', text: '文章已删除' })
      await fetchPosts()
    } catch {
      setNotice({ type: 'error', text: '删除失败，请稍后重试' })
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImporting(true)
    setNotice(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await api.post('/admin/posts/import', formData)
      setNotice({ type: 'success', text: `已导入《${response.data.title}》` })
      await fetchPosts()
    } catch (error) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
      setNotice({ type: 'error', text: typeof detail === 'string' ? detail : '导入失败，请检查文件格式' })
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async (post: { id: number; title: string }) => {
    setNotice(null)
    try {
      const response = await api.get(`/admin/posts/${post.id}/export`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${post.title.replace(/[\\/:*?"<>|]/g, '-')}.zip`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      setNotice({ type: 'success', text: `已导出《${post.title}》Markdown 资源包` })
    } catch {
      setNotice({ type: 'error', text: '导出失败，请稍后重试' })
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">文章管理</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.zip,text/markdown,application/zip"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="secondary" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? '导入中…' : '导入 .md / .zip'}
          </Button>
          <Link to="/admin/posts/new">
            <Button>新文章</Button>
          </Link>
        </div>
      </div>
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/45 px-4 py-3 text-xs leading-6 text-[var(--color-text-muted)]">
        <p><strong className="text-[var(--color-text)]">纯 Markdown：</strong>可直接导入 `.md`；网络图片和现有 `/uploads/…` 链接保持原样。</p>
        <p><strong className="text-[var(--color-text)]">包含本地图片：</strong>保持 Markdown 中的相对路径，把 `.md` 与图片目录一起压缩成 `.zip` 再导入。</p>
        <p><strong className="text-[var(--color-text)]">导出：</strong>生成包含 `article.md` 与 `assets/` 的 ZIP，站内上传图片会自动打包并改写为可迁移的相对路径。</p>
      </div>
      {notice && (
        <div
          role="status"
          className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
          }`}
        >
          {notice.text}
        </div>
      )}
      {loading ? (
        <div className="text-center text-[var(--color-text-muted)] py-12">加载中...</div>
      ) : posts.length === 0 ? (
        <p className="text-[var(--color-text-muted)] text-center py-12">暂无文章</p>
      ) : (
        <PostTable posts={posts} onDelete={handleDelete} onExport={handleExport} />
      )}
    </div>
  )
}
