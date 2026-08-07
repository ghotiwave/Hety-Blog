import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AlbumManage } from './AlbumManage'

const mocks = vi.hoisted(() => ({
  fetchAdminAlbum: vi.fn(),
  apiPut: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('@/services/album', () => ({ fetchAdminAlbum: mocks.fetchAdminAlbum }))
vi.mock('@/services/api', () => ({
  default: { put: mocks.apiPut, post: mocks.apiPost, delete: mocks.apiDelete },
}))
vi.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: (props: Record<string, unknown>) => props,
    getInputProps: () => ({ type: 'file' }),
    isDragActive: false,
  }),
}))

const photo = {
  id: 7,
  image_url: '/uploads/photo.webp',
  thumbnail_url: '/uploads/photo-thumb.webp',
  width: 1200,
  height: 800,
  caption: '原文字',
  location: '北京',
  taken_on: '2026-08-07',
  alt_text: '街道',
  show_in_carousel: false,
  show_in_gallery: true,
  carousel_order: 10,
  gallery_order: 20,
  published: true,
  created_at: '2026-08-07T20:00:00+08:00',
  updated_at: '2026-08-07T20:00:00+08:00',
}

describe('AlbumManage', () => {
  beforeEach(() => {
    mocks.fetchAdminAlbum.mockReset().mockResolvedValue({ items: [photo], autoplay_delay_ms: 6500 })
    mocks.apiPut.mockReset().mockResolvedValue({ data: { ...photo, location: '上海', show_in_carousel: true } })
    mocks.apiPost.mockReset()
    mocks.apiDelete.mockReset()
  })

  it('saves independent carousel and gallery switches with metadata', async () => {
    const user = userEvent.setup()
    render(<AlbumManage />)

    const location = await screen.findByLabelText('地点')
    await user.clear(location)
    await user.type(location, '上海')
    await user.clear(screen.getByLabelText('拍摄日期'))
    await user.type(screen.getByLabelText('拍摄日期'), '2026-08-08')
    await user.click(screen.getByLabelText('进入轮播'))
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    expect(mocks.apiPut).toHaveBeenCalledWith('/admin/album/7', expect.objectContaining({
      location: '上海',
      taken_on: '2026-08-08',
      show_in_carousel: true,
      show_in_gallery: true,
    }))
  })

  it('saves carousel speed and exposes a reusable markdown link', async () => {
    const user = userEvent.setup()
    render(<AlbumManage />)

    expect(await screen.findByText('![街道](/uploads/photo.webp)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '保存速度' }))

    expect(mocks.apiPut).toHaveBeenCalledWith('/admin/album/settings', { autoplay_delay_ms: 6500 })
  })
})
