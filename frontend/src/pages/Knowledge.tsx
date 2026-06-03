import { useState, useEffect, useMemo } from 'react'
import api from '@/services/api'
import ForceGraph2D from 'react-force-graph-2d'

interface Post {
  id: number; title: string; tags: string | null
}

export function Knowledge() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    api.get('/posts', { params: { page_size: 100 } }).then((res) => setPosts(res.data.items))
  }, [])

  // Build tag cloud
  const tagCloud = useMemo(() => {
    const map: Record<string, number> = {}
    posts.forEach((p) => {
      (p.tags || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
        map[t] = (map[t] || 0) + 1
      })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [posts])

  const maxCount = Math.max(...tagCloud.map(([, n]) => n), 1)

  // Build graph data
  const graphData = useMemo(() => {
    const nodes: { id: string; name: string; group: string; val: number }[] = []
    const links: { source: string; target: string }[] = []
    const tagSet = new Set<string>()

    posts.forEach((p) => {
      nodes.push({ id: `post-${p.id}`, name: p.title, group: 'post', val: 3 })
      ;(p.tags || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
        if (!tagSet.has(t)) {
          tagSet.add(t)
          const count = tagCloud.find(([k]) => k === t)?.[1] || 1
          nodes.push({ id: `tag-${t}`, name: t, group: 'tag', val: 1 + count })
        }
        links.push({ source: `tag-${t}`, target: `post-${p.id}` })
      })
    })

    return { nodes: [...new Map(nodes.map((n) => [n.id, n])).values()], links }
  }, [posts, tagCloud])

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl text-stone-800 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
        Knowledge Graph
      </h1>

      {/* Tag cloud */}
      <div className="flex flex-wrap gap-2 mb-12 justify-center">
        {tagCloud.map(([tag, count]) => {
          const size = 0.7 + (count / maxCount) * 1.5
          return (
            <span
              key={tag}
              className="cursor-pointer px-3 py-1 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
              style={{ fontSize: `${size}rem`, opacity: 0.5 + (count / maxCount) * 0.5 }}
            >
              {tag} <span className="text-xs ml-1 text-amber-500">{count}</span>
            </span>
          )
        })}
      </div>

      {/* Force graph */}
      {graphData.nodes.length > 0 && (
        <div className="border border-amber-200 rounded-xl overflow-hidden bg-white">
          <ForceGraph2D
            graphData={graphData}
            width={800}
            height={500}
            nodeLabel="name"
            nodeColor={(n: any) => (n.group === 'tag' ? '#d97706' : '#57534e')}
            nodeVal={(n: any) => n.val}
            linkColor={() => '#e7e5e4'}
            nodeCanvasObject={(n: any, ctx: CanvasRenderingContext2D, scale: number) => {
              const r = (n.val || 3) * 1.5
              ctx.beginPath()
              ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI)
              ctx.fillStyle = n.group === 'tag' ? '#d97706' : '#57534e'
              ctx.fill()
              if (scale > 1.5) {
                ctx.font = `${10 / scale}px system-ui`
                ctx.fillStyle = '#292524'
                ctx.textAlign = 'center'
                ctx.fillText(n.name.slice(0, 15), n.x!, n.y! + r + 12 / scale)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
