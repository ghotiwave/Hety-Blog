import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { Card, CardContent } from '@/components/ui/Card'

interface Digest {
  id: number
  title: string
  topic: string
  created_at: string
}

export function Digest() {
  const [digests, setDigests] = useState<Digest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/digests', { params: { page_size: 20 } })
      .then((res) => setDigests(res.data.items))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-gray-400 py-12">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl text-stone-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>AI News</h1>
      <p className="text-stone-400 italic mb-6 text-sm">Daily AI industry digest, auto-generated every morning.</p>
      <p className="text-sm text-gray-500 mb-8">
        Daily tech news summaries powered by DeepSeek. Updated every morning.
      </p>

      {digests.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No digests yet. The first one is being generated.
        </div>
      ) : (
        <div className="space-y-4">
          {digests.map((d) => (
            <Link key={d.id} to={`/digest/${d.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{d.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {d.topic} · {new Date(d.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <span className="text-gray-400">→</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
