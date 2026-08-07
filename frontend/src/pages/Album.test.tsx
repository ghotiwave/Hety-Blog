import type { MouseEvent, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Album } from './Album'

const mocks = vi.hoisted(() => ({
  fetchAlbum: vi.fn(),
  emblaApi: {
    selectedScrollSnap: vi.fn(() => 0),
    on: vi.fn(),
    off: vi.fn(),
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    scrollTo: vi.fn(),
  },
}))

vi.mock('@/services/album', () => ({ fetchAlbum: mocks.fetchAlbum }))
vi.mock('embla-carousel-autoplay', () => ({ default: vi.fn(() => ({})) }))
vi.mock('embla-carousel-react', () => ({ default: vi.fn(() => [vi.fn(), mocks.emblaApi]) }))
vi.mock('react-photo-album', () => ({
  RowsPhotoAlbum: ({ photos, onClick }: {
    photos: { src: string; alt?: string }[]
    onClick?: (props: { event: MouseEvent; photo: { src: string; alt?: string }; index: number }) => void
  }) => <div>{photos.map((photo, index) => <button type="button" aria-label={`打开 ${photo.alt}`} key={photo.src} onClick={(event) => onClick?.({ event, photo, index })}><img src={photo.src} alt={photo.alt} /></button>)}</div>,
}))
vi.mock('yet-another-react-lightbox', () => ({
  default: ({ open, index }: { open: boolean; index: number }) => open ? <div>LIGHTBOX_OPEN {index}</div> : null,
}))
vi.mock('yet-another-react-lightbox/plugins/captions', () => ({ default: (() => null) as unknown as ReactNode }))

describe('Album', () => {
  beforeEach(() => {
    mocks.fetchAlbum.mockReset().mockResolvedValue({
      carousel: [{
        id: 1,
        image_url: '/uploads/feature.webp',
        thumbnail_url: '/uploads/feature-thumb.webp',
        width: 1600,
        height: 900,
        caption: '晚风穿过桥面',
        location: '杭州 · 运河',
        taken_on: '2026-08-06',
        alt_text: '夜晚的桥',
        show_in_carousel: true,
        show_in_gallery: false,
        carousel_order: 10,
        gallery_order: 10,
        published: true,
        created_at: '2026-08-07T20:00:00+08:00',
        updated_at: '2026-08-07T20:00:00+08:00',
      }],
      gallery: [{
        id: 2,
        image_url: '/uploads/wall.webp',
        thumbnail_url: '/uploads/wall-thumb.webp',
        width: 1200,
        height: 800,
        caption: '海面',
        location: '厦门',
        taken_on: '2026-08-07',
        alt_text: '蓝色海面',
        show_in_carousel: false,
        show_in_gallery: true,
        carousel_order: 20,
        gallery_order: 20,
        published: true,
        created_at: '2026-08-07T20:00:00+08:00',
        updated_at: '2026-08-07T20:00:00+08:00',
      }],
      autoplay_delay_ms: 8000,
    })
  })

  it('renders the selected feature and opens gallery photos in the lightbox', async () => {
    const user = userEvent.setup()
    render(<Album />)

    expect(await screen.findByRole('heading', { name: '相簿' })).toBeInTheDocument()
    expect(screen.getByText('杭州 · 运河 · 2026/08/06')).toBeInTheDocument()
    expect(screen.getByText('“晚风穿过桥面”')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开 蓝色海面' }))
    expect(screen.getByText('LIGHTBOX_OPEN 0')).toBeInTheDocument()
  })

  it('marks portrait features so their captions can sit outside the image', async () => {
    mocks.fetchAlbum.mockResolvedValue({
      carousel: [{
        id: 3,
        image_url: '/uploads/portrait.webp',
        thumbnail_url: '/uploads/portrait-thumb.webp',
        width: 900,
        height: 1400,
        caption: '竖屏瞬间',
        location: '上海',
        taken_on: '2026-08-08',
        alt_text: '竖屏照片',
        show_in_carousel: true,
        show_in_gallery: false,
        carousel_order: 10,
        gallery_order: 10,
        published: true,
        created_at: '2026-08-08T20:00:00+08:00',
        updated_at: '2026-08-08T20:00:00+08:00',
      }],
      gallery: [],
      autoplay_delay_ms: 6500,
    })

    render(<Album />)

    const portrait = await screen.findByAltText('竖屏照片')
    expect(portrait.closest('.album-feature-card')).toHaveClass('is-portrait')
    expect(screen.getByText('“竖屏瞬间”')).toBeInTheDocument()
  })
})
