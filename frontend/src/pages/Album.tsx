import { useCallback, useEffect, useMemo, useState } from 'react'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import { RowsPhotoAlbum, type Photo } from 'react-photo-album'
import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import axios from 'axios'
import 'react-photo-album/rows.css'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'

import { fetchAlbum, type AlbumPhoto } from '@/services/album'
import { SectionHeading } from '@/components/layout/SectionHeading'

interface GalleryPhoto extends Photo {
  albumPhoto: AlbumPhoto
}

function formatPhotoDate(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(`${value}T00:00:00`))
}

function CarouselArrow({ direction }: { direction: 'previous' | 'next' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={direction === 'previous' ? 'rotate-180' : ''}>
      <path d="M8.2 5.9c0-1.05 1.17-1.68 2.05-1.1l8.23 5.43a2.1 2.1 0 0 1 0 3.54l-8.23 5.43c-.88.58-2.05-.05-2.05-1.1V5.9Z" />
    </svg>
  )
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reduced
}

function relativeSlidePosition(index: number, selected: number, total: number) {
  let distance = index - selected
  if (total > 2) {
    if (distance > total / 2) distance -= total
    if (distance < -total / 2) distance += total
  }
  if (distance === 0) return 'is-current'
  if (distance === -1) return 'is-previous'
  if (distance === 1) return 'is-next'
  return 'is-distant'
}

export function Album() {
  const [carousel, setCarousel] = useState<AlbumPhoto[]>([])
  const [gallery, setGallery] = useState<AlbumPhoto[]>([])
  const [autoplayDelay, setAutoplayDelay] = useState(6500)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestVersion, setRequestVersion] = useState(0)
  const [selected, setSelected] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const reducedMotion = useReducedMotion()
  const autoplay = useMemo(() => Autoplay({ delay: autoplayDelay, stopOnFocusIn: true, stopOnMouseEnter: true, stopOnInteraction: false }), [autoplayDelay])
  const plugins = useMemo(() => reducedMotion ? [] : [autoplay], [autoplay, reducedMotion])
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: 'center', loop: carousel.length > 2, skipSnaps: false },
    plugins,
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchAlbum(controller.signal)
      .then((feed) => {
        setCarousel(feed.carousel)
        setGallery(feed.gallery)
        setAutoplayDelay(feed.autoplay_delay_ms)
        setError('')
      })
      .catch((requestError) => {
        if (!axios.isCancel(requestError)) setError('相簿加载失败，请检查网络后重试。')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [requestVersion])

  useEffect(() => {
    if (!emblaApi) return
    const update = () => setSelected(emblaApi.selectedScrollSnap())
    update()
    emblaApi.on('select', update)
    emblaApi.on('reInit', update)
    return () => {
      emblaApi.off('select', update)
      emblaApi.off('reInit', update)
    }
  }, [emblaApi])

  const galleryPhotos = useMemo<GalleryPhoto[]>(() => gallery.map((photo) => ({
    src: photo.thumbnail_url,
    width: photo.width,
    height: photo.height,
    alt: photo.alt_text || photo.caption || '相簿照片',
    title: photo.caption || undefined,
    albumPhoto: photo,
  })), [gallery])

  const lightboxSlides = useMemo(() => gallery.map((photo) => ({
    src: photo.image_url,
    width: photo.width,
    height: photo.height,
    alt: photo.alt_text || photo.caption || '相簿照片',
    title: [photo.location, formatPhotoDate(photo.taken_on)].filter(Boolean).join(' · ') || undefined,
    description: photo.caption || undefined,
  })), [gallery])

  const openGalleryPhoto = useCallback(({ index }: { index: number }) => setLightboxIndex(index), [])

  if (loading) {
    return <div className="flex min-h-[55vh] items-center justify-center text-sm text-[var(--color-text-muted)]">正在整理相片…</div>
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/25 bg-red-500/5 px-5 py-16 text-center">
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        <button type="button" onClick={() => { setLoading(true); setRequestVersion((value) => value + 1) }} className="mt-4 text-sm text-[var(--color-primary)] hover:underline">重新加载</button>
      </div>
    )
  }

  return (
    <div className="album-page mx-auto max-w-6xl pb-12">
      <div className="mx-auto max-w-[60rem]">
        <SectionHeading eyebrow="PHOTOGRAPHY / ARCHIVE" title="相簿" description={`已记录 ${gallery.length} 个瞬间`} />
      </div>

      {carousel.length > 0 ? (
        <section className="album-feature" aria-label="精选照片">
          <div className="album-carousel-viewport" ref={emblaRef}>
            <div className="album-carousel-track">
              {carousel.map((photo, index) => (
                <div className="album-carousel-slide" key={photo.id}>
                  <article className={`album-feature-card ${relativeSlidePosition(index, selected, carousel.length)}`}>
                    <img src={photo.image_url} alt={photo.alt_text || photo.caption || '精选照片'} draggable={false} />
                    {(photo.caption || photo.location || photo.taken_on) && (
                      <div className="album-feature-caption">
                        {(photo.location || photo.taken_on) && <span>{[photo.location, formatPhotoDate(photo.taken_on)].filter(Boolean).join(' · ')}</span>}
                        {photo.caption && <blockquote>“{photo.caption}”</blockquote>}
                      </div>
                    )}
                  </article>
                </div>
              ))}
            </div>
          </div>
          {carousel.length > 1 && <div className="album-carousel-controls">
            <button type="button" onClick={() => emblaApi?.scrollPrev()} aria-label="上一张精选照片"><CarouselArrow direction="previous" /></button>
            <div className="album-carousel-dots" aria-label="精选照片分页">
              {carousel.map((photo, index) => (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => emblaApi?.scrollTo(index)}
                  className={selected === index ? 'is-current' : ''}
                  aria-label={`查看第 ${index + 1} 张精选照片`}
                  aria-current={selected === index ? 'true' : undefined}
                />
              ))}
            </div>
            <span className="album-carousel-count">{String(selected + 1).padStart(2, '0')} / {String(carousel.length).padStart(2, '0')}</span>
            <button type="button" onClick={() => emblaApi?.scrollNext()} aria-label="下一张精选照片"><CarouselArrow direction="next" /></button>
          </div>}
        </section>
      ) : (
        <div className="album-feature-empty">精选照片将在这里轮播。</div>
      )}

      <div className="album-divider" aria-hidden="true">
        <span>PHOTO INDEX</span>
        <i />
        <span>{String(gallery.length).padStart(2, '0')}</span>
      </div>

      {galleryPhotos.length > 0 ? (
        <section aria-label="照片墙" className="album-grid">
          <RowsPhotoAlbum<GalleryPhoto>
            photos={galleryPhotos}
            targetRowHeight={(containerWidth) => containerWidth < 560 ? 150 : 245}
            spacing={(containerWidth) => containerWidth < 560 ? 8 : 14}
            rowConstraints={{ maxPhotos: 4, singleRowMaxHeight: 320 }}
            onClick={openGalleryPhoto}
            componentsProps={{
              button: { className: 'album-grid-button' },
              image: { loading: 'lazy', decoding: 'async' },
            }}
          />
        </section>
      ) : (
        <div className="album-grid-empty">照片墙还是空的，下一次快门会从这里开始。</div>
      )}

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={Math.max(lightboxIndex, 0)}
        slides={lightboxSlides}
        plugins={[Captions]}
        captions={{ descriptionTextAlign: 'start', descriptionMaxLines: 4 }}
        carousel={{ imageFit: 'contain', padding: '4%' }}
        labels={{ Previous: '上一张', Next: '下一张', Close: '关闭', Lightbox: '相簿大图浏览' }}
        styles={{ root: { '--yarl__color_backdrop': 'rgba(5, 5, 7, 0.94)' } }}
      />
    </div>
  )
}
