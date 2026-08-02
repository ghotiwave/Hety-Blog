import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Post {
  id: number
  title: string
  published: boolean
  created_at: string
  comment_count: number
}

interface Props {
  posts: Post[]
  onDelete: (id: number) => void
  onExport: (post: Post) => void
}

export function PostTable({ posts, onDelete, onExport }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">标题</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">状态</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">日期</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">评论</th>
            <th className="text-right py-3 px-4 font-medium text-[var(--color-text-muted)]">操作</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface)]">
              <td className="py-3 px-4 text-[var(--color-text)]">{p.title}</td>
              <td className="py-3 px-4">
                <Badge className={p.published ? 'bg-green-500/10 text-green-500' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}>
                  {p.published ? '已发布' : '草稿'}
                </Badge>
              </td>
              <td className="py-3 px-4 text-[var(--color-text-muted)]">{new Date(p.created_at).toLocaleDateString('zh-CN')}</td>
              <td className="py-3 px-4 text-[var(--color-text-muted)]">{p.comment_count}</td>
              <td className="py-3 px-4 text-right">
                <div className="flex min-w-max justify-end gap-1 sm:gap-2">
                  <Link to={`/admin/posts/${p.id}/edit`}>
                    <Button variant="ghost" size="sm">编辑</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => onExport(p)}>导出资源包</Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(p.id)}>删除</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
