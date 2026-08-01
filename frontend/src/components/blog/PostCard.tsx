import { Link } from 'react-router-dom'

interface Props {
  id: number
  slug?: string | null
  title: string
  summary: string | null
  coverImage: string | null
  tags?: string | null
  createdAt: string
  commentCount: number
  likeCount?: number
  viewCount?: number
  wordCount?: number
  readingMinutes?: number
  activeTag?: string
  onTagClick?: (tag: string) => void
}

export function PostCard({ id, slug, title, summary, coverImage, tags, createdAt, likeCount = 0, wordCount = 0, readingMinutes = 1, activeTag, onTagClick }: Props) {
  const tagList = (tags || '').split(',').map((t) => t.trim()).filter(Boolean)

  return (
    <Link to={`/blog/${slug || id}`} className="block group mb-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 shadow-[0_8px_24px_rgba(0,0,0,0.035)] hover:bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40 hover:-translate-y-0.5 transition-all overflow-hidden">
      <div className="flex gap-4 p-4 md:p-5">
        {coverImage && (
          <img src={coverImage} alt={title} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors mb-1.5 leading-snug font-semibold tracking-tight">
            {title}
          </h3>
          {summary && <p className="text-sm text-[var(--color-text-muted)] mb-3 line-clamp-2 leading-relaxed">{summary}</p>}
          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
            <span className="text-xs text-[var(--color-text-muted)]">{new Date(createdAt).toLocaleDateString('zh-CN')}</span>
            {tagList.length > 0 && tagList.map((tag) => (
              <span
                key={tag}
                onClick={(e) => { e.preventDefault(); onTagClick?.(tag) }}
                className={`px-2 py-0.5 text-[10px] cursor-pointer transition-colors ${
                  activeTag === tag
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
                }`}
              >
                {tag}
              </span>
            ))}
            <span className="text-xs text-[var(--color-text-muted)]">{likeCount} likes</span>
            <span className="text-xs text-[var(--color-text-muted)]">{wordCount} 字</span>
            <span className="text-xs text-[var(--color-text-muted)]">{readingMinutes} min read</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
