import { useState, useEffect, useMemo } from 'react'
import api from '@/services/api'
import ForceGraph2D from 'react-force-graph-2d'

interface Props {
  currentPostId?: number
  onClose: () => void
}

export function GraphModal({ currentPostId, onClose }: Props) {
  const [posts, setPosts] = useState<any[]>([])
  const [dims, setDims] = useState({ w: 800, h: 500 })

  useEffect(() => {
    api.get('/posts', { params: { page_size: 50 } }).then((res) => setPosts(res.data.items))
    setDims({ w: Math.min(window.innerWidth * 0.85, 900), h: window.innerHeight * 0.7 })
  }, [])

  const graphData = useMemo(() => {
    if (posts.length === 0) return { nodes: [], links: [] }

    const tagToPosts: Record<string, number[]> = {}
    posts.forEach((p) => {
      const tags = (p.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean)
      tags.forEach((tag: string) => {
        if (!tagToPosts[tag]) tagToPosts[tag] = []
        tagToPosts[tag].push(p.id)
      })
    })

    const nodes: any[] = posts.map((p) => ({
      id: `p${p.id}`, name: p.title, val: p.id === currentPostId ? 8 : 4,
      isCurrent: p.id === currentPostId,
    }))

    const linkSet = new Set<string>()
    const links: any[] = []
    Object.values(tagToPosts).forEach((ids) => {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = `${Math.min(ids[i], ids[j])}-${Math.max(ids[i], ids[j])}`
          if (!linkSet.has(key)) {
            linkSet.add(key)
            links.push({ source: `p${ids[i]}`, target: `p${ids[j]}` })
          }
        }
      }
    })

    return { nodes, links }
  }, [posts, currentPostId])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90vw] h-[85vh] max-w-5xl relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg text-stone-700" style={{ fontFamily: 'Georgia, serif' }}>
            Article Graph · {posts.length} posts
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl cursor-pointer">&times;</button>
        </div>
        {graphData.nodes.length > 0 && (
          <ForceGraph2D
            graphData={graphData}
            width={dims.w}
            height={dims.h}
            nodeLabel="name"
            nodeColor={(n: any) => n.isCurrent ? '#ea580c' : '#78716c'}
            nodeVal={(n: any) => n.val}
            linkColor={() => '#d4d4d4'}
            nodeCanvasObject={(n: any, ctx: CanvasRenderingContext2D, scale: number) => {
              const r = n.isCurrent ? 6 : 3
              ctx.beginPath(); ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI)
              ctx.fillStyle = n.isCurrent ? '#ea580c' : '#78716c'
              ctx.fill()
              if (scale > 2) {
                ctx.font = `${8 / scale}px system-ui`
                ctx.fillStyle = '#292524'; ctx.textAlign = 'center'
                ctx.fillText(n.name.slice(0, 20), n.x!, n.y! + r + 8 / scale)
              }
            }}
          />
        )}
      </div>
    </div>
  )
}
