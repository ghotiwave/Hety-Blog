import { Link } from 'react-router-dom'

interface Props {
  id: number
  title: string
  summary: string | null
  coverImage: string | null
  tags?: string | null
  createdAt: string
  commentCount: number
  activeTag?: string
  onTagClick?: (tag: string) => void
}

export function PostCard({ id, title, summary, coverImage, tags, createdAt, commentCount, activeTag, onTagClick }: Props) {
  const tagList = (tags || '').split(',').map((t) => t.trim()).filter(Boolean)

  return (
    <Link to={`/blog/${id}`} className="block group py-6 border-b border-amber-200/60 hover:bg-amber-50/30 transition-colors px-2 -mx-2 rounded">
      <div className="flex gap-5">
        {coverImage && (
          <img src={coverImage} alt={title} className="w-24 h-24 object-cover rounded flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg text-stone-800 group-hover:text-amber-700 transition-colors mb-1 leading-snug" style={{ fontFamily: 'Georgia, serif' }}>
            {title}
          </h3>
          {summary && <p className="text-sm text-stone-400 mb-2 line-clamp-2">{summary}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-stone-300 italic">
              {new Date(createdAt).toLocaleDateString('zh-CN')} · {commentCount} comments
            </span>
            {tagList.length > 0 && tagList.map((tag) => (
              <span
                key={tag}
                onClick={(e) => { e.preventDefault(); onTagClick?.(tag) }}
                className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer transition-colors ${
                  activeTag === tag
                    ? 'bg-amber-700 text-white'
                    : 'bg-amber-100/50 text-amber-800 hover:bg-amber-200'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  )
}
