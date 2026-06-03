import { Card, CardContent } from '@/components/ui/Card'

interface Props {
  stats: Record<string, number> | null
}

export function DashboardStats({ stats }: Props) {
  if (!stats) return null
  const cards = [
    { label: 'Total Posts', value: stats.total_posts },
    { label: 'Published', value: stats.published_posts },
    { label: 'Comments', value: stats.total_comments },
    { label: 'Users', value: stats.total_users },
    { label: 'Likes', value: stats.total_likes },
    { label: 'Views', value: stats.total_views },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((s) => (
        <Card key={s.label}>
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
