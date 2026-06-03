import { Link } from 'react-router-dom'

interface Props {
  id: number
  title: string
  summary: string | null
  coverImage: string | null
  tags?: string | null
  createdAt: string
  commentCount: number
  likeCount?: number
  viewCount?: number
  activeTag?: string
  onTagClick?: (tag: string) => void
}

export function PostCard({ id, title, summary, coverImage, tags, createdAt, commentCount, likeCount = 0, viewCount = 0, activeTag, onTagClick }: Props) {
  const tagList = (tags || '').split(',').map((t) => t.trim()).filter(Boolean)

  return (
    <Link to={`/blog/${id}`} className="block group py-5 border-b border-[#e8e6e0]/60 hover:bg-[#f5f4f0]/50 transition-colors px-2 -mx-2">
      <div className="flex gap-5">
        {coverImage && (
          <img src={coverImage} alt={title} className="w-24 h-24 object-cover rounded flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg text-[#3a3a38] group-hover:text-[#8b7355] transition-colors mb-1 leading-snug font-normal tracking-wide">
            {title}
          </h3>
          {summary && <p className="text-sm text-[#b5b4af] mb-2 line-clamp-2">{summary}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#c5c4bf]">
              {new Date(createdAt).toLocaleDateString('zh-CN')} · {commentCount} 评论 · {likeCount} 赞
            </span>
            {tagList.length > 0 && tagList.map((tag) => (
              <span
                key={tag}
                onClick={(e) => { e.preventDefault(); onTagClick?.(tag) }}
                className={`px-2 py-0.5 text-[10px] cursor-pointer transition-colors ${
                  activeTag === tag
                    ? 'bg-[#8b7355] text-white'
                    : 'bg-[#f0eeea] text-[#9a9996] hover:bg-[#e8e6e0]'
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
