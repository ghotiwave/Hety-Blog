import { Card, CardContent } from '@/components/ui/Card'

interface Props {
  stats: Record<string, number> | null
}

export function DashboardStats({ stats }: Props) {
  if (!stats) return null
  const cards = [
    { label: '文章总数', value: stats.total_posts },
    { label: '已发布', value: stats.published_posts },
    { label: '评论数', value: stats.total_comments },
    { label: '用户数', value: stats.total_users },
    { label: '点赞数', value: stats.total_likes },
    { label: '浏览量', value: stats.total_views },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((s) => (
        <Card key={s.label}>
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-[var(--color-text)]">{s.value}</div>
            <div className="text-sm text-[var(--color-text-muted)]">{s.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
