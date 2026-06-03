import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import api from '@/services/api'
import { Button } from '@/components/ui/Button'

interface Digest {
  id: number
  title: string
  topic: string
  content: string
  source_urls: string | null
  created_at: string
}

export function DigestDetail() {
  const { id } = useParams<{ id: string }>()
  const [digest, setDigest] = useState<Digest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/digests/${id}`).then((res) => {
      setDigest(res.data)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center text-gray-400 py-12">Loading...</div>
  if (!digest) return <div className="text-center text-gray-400 py-12">Digest not found.</div>

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/digest">
        <Button variant="ghost" size="sm" className="mb-4">← 返回</Button>
      </Link>

      <article className="bg-white rounded-xl border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{digest.title}</h1>
        <p className="text-sm text-gray-400 mb-8">
          {digest.topic} · {new Date(digest.created_at).toLocaleDateString('zh-CN')}
        </p>
        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {digest.content}
          </ReactMarkdown>
        </div>

        {digest.source_urls && (() => {
          try {
            const urls: string[] = JSON.parse(digest.source_urls)
            if (urls.length === 0) return null
            return (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Sources</h3>
                <ul className="space-y-1">
                  {urls.map((url, i) => (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )
          } catch { return null }
        })()}
      </article>
    </div>
  )
}
