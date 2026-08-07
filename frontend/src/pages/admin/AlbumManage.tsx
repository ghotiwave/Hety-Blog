import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import axios from 'axios'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import api from '@/services/api'
import { fetchAdminAlbum, type AlbumPhoto } from '@/services/album'

type Notice = { type: 'success' | 'error'; text: string }

function versionedImage(url: string, updatedAt: string) {
  return `${url}?v=${encodeURIComponent(updatedAt)}`
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-muted)]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
      {label}
    </label>
  )
}

export function AlbumManage() {
  const [photos, setPhotos] = useState<AlbumPhoto[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [uploadToCarousel, setUploadToCarousel] = useState(false)
  const [uploadToGallery, setUploadToGallery] = useState(true)
  const [uploadRotation, setUploadRotation] = useState(0)
  const [autoplayDelay, setAutoplayDelay] = useState(6500)
  const [savingSettings, setSavingSettings] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)

  const applyPhotoList = useCallback((items: AlbumPhoto[]) => {
    setPhotos(items)
    setSelectedId((current) => current && items.some((photo) => photo.id === current) ? current : (items[0]?.id ?? null))
  }, [])

  const loadPhotos = useCallback(async (signal?: AbortSignal) => {
    try {
      const feed = await fetchAdminAlbum(signal)
      applyPhotoList(feed.items)
      setAutoplayDelay(feed.autoplay_delay_ms)
      setNotice(null)
    } catch (error) {
      if (!axios.isCancel(error)) setNotice({ type: 'error', text: '相簿列表加载失败，请重试' })
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [applyPhotoList])

  useEffect(() => {
    const controller = new AbortController()
    fetchAdminAlbum(controller.signal)
      .then((feed) => {
        applyPhotoList(feed.items)
        setAutoplayDelay(feed.autoplay_delay_ms)
        setNotice(null)
      })
      .catch((error) => {
        if (!axios.isCancel(error)) setNotice({ type: 'error', text: '相簿列表加载失败，请重试' })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [applyPhotoList])

  const selectedPhoto = useMemo(
    () => photos.find((photo) => photo.id === selectedId) ?? null,
    [photos, selectedId],
  )

  const handleRejected = useCallback((rejections: FileRejection[]) => {
    const tooLarge = rejections.some(({ errors }) => errors.some(({ code }) => code === 'file-too-large'))
    setNotice({ type: 'error', text: tooLarge ? '单张照片不能超过 20 MB' : '仅支持 HEIC、HEIF、JPEG、PNG 或 WebP 照片' })
  }, [])

  const handleDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    setNotice(null)
    let completed = 0
    const failures: string[] = []
    const uploadedIds: number[] = []
    for (const file of files) {
      setUploadProgress(`正在上传 ${completed + 1} / ${files.length}：${file.name}`)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('show_in_carousel', String(uploadToCarousel))
      formData.append('show_in_gallery', String(uploadToGallery))
      formData.append('rotation', String(uploadRotation))
      formData.append('published', 'true')
      try {
        const response = await api.post<AlbumPhoto>('/admin/album', formData)
        uploadedIds.push(response.data.id)
        completed += 1
      } catch (error) {
        const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
        failures.push(`${file.name}：${typeof detail === 'string' ? detail : '上传失败'}`)
      }
    }
    await loadPhotos()
    if (uploadedIds.length > 0) setSelectedId(uploadedIds[0])
    setUploading(false)
    setUploadProgress('')
    setNotice(failures.length > 0
      ? { type: 'error', text: `成功 ${completed} 张；${failures.join('；')}` }
      : { type: 'success', text: `已上传 ${completed} 张照片，可在下方复制 Markdown 引用` })
  }, [loadPhotos, uploadRotation, uploadToCarousel, uploadToGallery])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    onDropRejected: handleRejected,
    maxSize: 20 * 1024 * 1024,
    multiple: true,
    disabled: uploading,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
    },
  })

  const patchPhoto = <K extends keyof AlbumPhoto>(id: number, field: K, value: AlbumPhoto[K]) => {
    setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, [field]: value } : photo))
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    setNotice(null)
    try {
      await api.put('/admin/album/settings', { autoplay_delay_ms: autoplayDelay })
      setNotice({ type: 'success', text: `轮播间隔已设为 ${(autoplayDelay / 1000).toFixed(1)} 秒` })
    } catch {
      setNotice({ type: 'error', text: '轮播速度保存失败，请重试' })
    } finally {
      setSavingSettings(false)
    }
  }

  const rotatePhoto = async (photo: AlbumPhoto, degrees: -90 | 90) => {
    setSavingId(photo.id)
    setNotice(null)
    try {
      const response = await api.post<AlbumPhoto>(`/admin/album/${photo.id}/rotate`, { degrees })
      setPhotos((current) => current.map((item) => item.id === photo.id ? response.data : item))
      setNotice({ type: 'success', text: degrees < 0 ? '照片已向左旋转' : '照片已向右旋转' })
    } catch {
      setNotice({ type: 'error', text: '照片旋转失败，请重试' })
    } finally {
      setSavingId(null)
    }
  }

  const copyMarkdown = async (photo: AlbumPhoto) => {
    const alt = (photo.alt_text || photo.caption || '').replace(/\r?\n/g, ' ').replaceAll('[', '').replaceAll(']', '').trim()
    const markdown = `![${alt}](${photo.image_url})`
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(markdown)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = markdown
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
      setNotice({ type: 'success', text: 'Markdown 图片引用已复制' })
    } catch {
      setNotice({ type: 'error', text: '复制失败，请手动复制引用' })
    }
  }

  const savePhoto = async (photo: AlbumPhoto) => {
    setSavingId(photo.id)
    setNotice(null)
    try {
      const response = await api.put<AlbumPhoto>(`/admin/album/${photo.id}`, {
        caption: photo.caption,
        location: photo.location,
        taken_on: photo.taken_on,
        alt_text: photo.alt_text,
        show_in_carousel: photo.show_in_carousel,
        show_in_gallery: photo.show_in_gallery,
        carousel_order: photo.carousel_order,
        gallery_order: photo.gallery_order,
        published: photo.published,
      })
      setPhotos((current) => current.map((item) => item.id === photo.id ? response.data : item))
      setNotice({ type: 'success', text: '照片信息已保存' })
    } catch (error) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
      setNotice({ type: 'error', text: typeof detail === 'string' ? detail : '保存失败，请重试' })
    } finally {
      setSavingId(null)
    }
  }

  const deletePhoto = async (photo: AlbumPhoto) => {
    if (!confirm('确定删除这张照片？展示图和缩略图也会一并删除。')) return
    setSavingId(photo.id)
    try {
      await api.delete(`/admin/album/${photo.id}`)
      const remaining = photos.filter((item) => item.id !== photo.id)
      setPhotos(remaining)
      if (selectedId === photo.id) setSelectedId(remaining[0]?.id ?? null)
      setNotice({ type: 'success', text: '照片已删除' })
    } catch {
      setNotice({ type: 'error', text: '删除失败，请重试' })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="album-admin-page">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">相簿管理</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">上传照片，再选择一张编辑它的展示位置和信息。</p>
      </div>

      <div className="album-admin-settings mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/45 p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-4 border-b border-[var(--color-border)] pb-5">
          <label className="min-w-56 flex-1 text-xs text-[var(--color-text-muted)]">轮播间隔
            <div className="mt-2 flex items-center gap-3">
              <input type="range" min={2000} max={20000} step={500} value={autoplayDelay} onChange={(event) => setAutoplayDelay(Number(event.target.value))} className="min-w-32 flex-1 accent-[var(--color-primary)]" />
              <output className="w-14 font-mono text-[11px] text-[var(--color-text)]">{(autoplayDelay / 1000).toFixed(1)} s</output>
            </div>
          </label>
          <Button variant="secondary" size="sm" disabled={savingSettings} onClick={saveSettings}>{savingSettings ? '保存中…' : '保存速度'}</Button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-5">
          <Toggle checked={uploadToCarousel} onChange={setUploadToCarousel} label="新照片进入轮播" />
          <Toggle checked={uploadToGallery} onChange={setUploadToGallery} label="新照片进入照片墙" />
          <label className="ml-auto flex items-center gap-2 text-sm text-[var(--color-text-muted)]">上传方向
            <select value={uploadRotation} onChange={(event) => setUploadRotation(Number(event.target.value))} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs text-[var(--color-text)]">
              <option value={0}>保持原方向</option>
              <option value={90}>向右转 90°</option>
              <option value={180}>旋转 180°</option>
              <option value={270}>向左转 90°</option>
            </select>
          </label>
        </div>
        <div
          {...getRootProps({
            className: `album-dropzone ${isDragActive ? 'is-active' : ''} ${uploading ? 'is-disabled' : ''}`,
            role: 'button',
            'aria-label': '上传相簿照片',
          })}
        >
          <input {...getInputProps()} />
          <span className="album-dropzone-icon">＋</span>
          <strong>{isDragActive ? '松开即可上传' : '拖入照片，或点击选择'}</strong>
          <small>HEIC / HEIF / JPEG / PNG / WebP · 每张不超过 20 MB</small>
          {uploadProgress && <em>{uploadProgress}</em>}
        </div>
      </div>

      {notice && (
        <div role="status" className={`mb-5 rounded-lg border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'}`}>
          {notice.text}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[var(--color-text-muted)]">加载中…</div>
      ) : photos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-14 text-center text-sm text-[var(--color-text-muted)]">还没有照片，从上方上传第一张。</div>
      ) : (
        <div className="album-admin-workspace">
          <aside className="album-admin-list" aria-label="已上传照片">
            <div className="album-admin-list-heading">
              <strong>已上传</strong>
              <span>{photos.length} 张</span>
            </div>
            <div className="album-admin-list-items">
              {photos.map((photo) => (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => setSelectedId(photo.id)}
                  className={`album-admin-photo ${selectedId === photo.id ? 'is-selected' : ''}`}
                  aria-pressed={selectedId === photo.id}
                >
                  <img src={versionedImage(photo.thumbnail_url, photo.updated_at)} alt="" />
                  <span>
                    <strong>{photo.caption || photo.location || `照片 ${photo.id}`}</strong>
                    <small>{photo.taken_on || new Date(photo.created_at).toLocaleDateString('zh-CN')}</small>
                  </span>
                  <i aria-hidden="true">{photo.show_in_carousel ? '轮' : ''}{photo.show_in_gallery ? '墙' : ''}</i>
                </button>
              ))}
            </div>
          </aside>

          {selectedPhoto && (
            <article className="album-admin-editor">
              <div className="album-admin-preview-wrap">
                <img src={versionedImage(selectedPhoto.image_url, selectedPhoto.updated_at)} alt={selectedPhoto.alt_text || ''} className="album-admin-preview" />
                <div className="album-admin-rotate" aria-label="旋转照片">
                  <button type="button" disabled={savingId === selectedPhoto.id} onClick={() => rotatePhoto(selectedPhoto, -90)} aria-label="向左旋转 90 度">↶</button>
                  <button type="button" disabled={savingId === selectedPhoto.id} onClick={() => rotatePhoto(selectedPhoto, 90)} aria-label="向右旋转 90 度">↷</button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-[var(--color-text-muted)]">地点
                  <Input value={selectedPhoto.location || ''} maxLength={200} onChange={(event) => patchPhoto(selectedPhoto.id, 'location', event.target.value)} className="mt-1" placeholder="例如：杭州 · 西湖" />
                </label>
                <label className="text-xs text-[var(--color-text-muted)]">拍摄日期
                  <Input type="date" value={selectedPhoto.taken_on || ''} onChange={(event) => patchPhoto(selectedPhoto.id, 'taken_on', event.target.value || null)} className="mt-1" />
                </label>
              </div>
              <label className="block text-xs text-[var(--color-text-muted)]">文字
                <Textarea value={selectedPhoto.caption || ''} maxLength={1000} onChange={(event) => patchPhoto(selectedPhoto.id, 'caption', event.target.value)} className="mt-1 min-h-20" placeholder="轮播和灯箱中显示的文字" />
              </label>
              <label className="block text-xs text-[var(--color-text-muted)]">替代文本
                <Input value={selectedPhoto.alt_text || ''} maxLength={300} onChange={(event) => patchPhoto(selectedPhoto.id, 'alt_text', event.target.value)} className="mt-1" placeholder="为无法看到图片的人描述画面" />
              </label>
              <div className="album-markdown-reference">
                <div>
                  <strong>博客图片引用</strong>
                  <code>{`![${selectedPhoto.alt_text || selectedPhoto.caption || ''}](${selectedPhoto.image_url})`}</code>
                </div>
                <Button variant="secondary" size="sm" onClick={() => copyMarkdown(selectedPhoto)}>复制 Markdown</Button>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-3 border-y border-[var(--color-border)] py-4">
                <Toggle checked={selectedPhoto.show_in_carousel} onChange={(value) => patchPhoto(selectedPhoto.id, 'show_in_carousel', value)} label="进入轮播" />
                <Toggle checked={selectedPhoto.show_in_gallery} onChange={(value) => patchPhoto(selectedPhoto.id, 'show_in_gallery', value)} label="进入照片墙" />
                <Toggle checked={selectedPhoto.published} onChange={(value) => patchPhoto(selectedPhoto.id, 'published', value)} label="公开显示" />
              </div>
              <div>
                <div className="grid max-w-sm grid-cols-2 gap-3">
                  <label className="text-xs text-[var(--color-text-muted)]">轮播顺序
                    <Input type="number" min={0} value={selectedPhoto.carousel_order} onChange={(event) => patchPhoto(selectedPhoto.id, 'carousel_order', Number(event.target.value))} className="mt-1" />
                  </label>
                  <label className="text-xs text-[var(--color-text-muted)]">照片墙顺序
                    <Input type="number" min={0} value={selectedPhoto.gallery_order} onChange={(event) => patchPhoto(selectedPhoto.id, 'gallery_order', Number(event.target.value))} className="mt-1" />
                  </label>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[var(--color-text-muted)]">数字越小越靠前；可用 15 将照片插入 10 与 20 之间。</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="danger" size="sm" disabled={savingId === selectedPhoto.id} onClick={() => deletePhoto(selectedPhoto)}>删除</Button>
                <Button size="sm" disabled={savingId === selectedPhoto.id} onClick={() => savePhoto(selectedPhoto)}>{savingId === selectedPhoto.id ? '保存中…' : '保存修改'}</Button>
              </div>
            </article>
          )}
        </div>
      )}
    </div>
  )
}
