import api from '@/services/api'

export interface AlbumPhoto {
  id: number
  image_url: string
  thumbnail_url: string
  width: number
  height: number
  caption: string | null
  location: string | null
  taken_on: string | null
  alt_text: string | null
  show_in_carousel: boolean
  show_in_gallery: boolean
  carousel_order: number
  gallery_order: number
  published: boolean
  created_at: string
  updated_at: string
}

export interface AlbumFeed {
  carousel: AlbumPhoto[]
  gallery: AlbumPhoto[]
  autoplay_delay_ms: number
}

export interface AlbumAdminFeed {
  items: AlbumPhoto[]
  autoplay_delay_ms: number
}

export async function fetchAlbum(signal?: AbortSignal): Promise<AlbumFeed> {
  const response = await api.get<AlbumFeed>('/album', { signal })
  return response.data
}

export async function fetchAdminAlbum(signal?: AbortSignal): Promise<AlbumAdminFeed> {
  const response = await api.get<AlbumAdminFeed>('/admin/album', { signal })
  return response.data
}
