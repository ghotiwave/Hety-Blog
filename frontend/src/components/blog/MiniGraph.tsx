import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import api from '@/services/api'
import ForceGraph2D from 'react-force-graph-2d'

interface Props {
  currentPostId: number
  tags: string
  onExpand: () => void
}

export function MiniGraph({ currentPostId, tags, onExpand }: Props) {
  const [posts, setPosts] = useState<any[]>([])
  const [size, setSize] = useState({ w: 220, h: 180 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get('/posts', { params: { page_size: 50 } }).then((res) => setPosts(res.data.items))
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      setSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight })
    }
  }, [])

  const graphData = useMemo(() => {
    const currentTags = (tags || '').split(',').map((t) => t.trim()).filter(Boolean)
    if (currentTags.length === 0) return { nodes: [], links: [] }

    const related = posts.filter((p) => {
      if (p.id === currentPostId) return false
      const pt = (p.tags || '').split(',').map((t) => t.trim()).filter(Boolean)
      return pt.some((t) => currentTags.includes(t))
    })

    const nodes: any[] = [{ id: `p${currentPostId}`, name: '📍', val: 8 }]
    related.forEach((p) => nodes.push({ id: `p${p.id}`, name: p.title, val: 4 }))

    const links = related.map((p) => ({ source: `p${currentPostId}`, target: `p${p.id}` }))

    return { nodes, links }
  }, [posts, tags, currentPostId])

  if (graphData.nodes.length <= 1) return null

  return (
    <div className="border border-amber-200 rounded-xl bg-white overflow-hidden cursor-pointer relative group" onClick={onExpand}>
      <div ref={containerRef} style={{ width: '100%', height: 180 }}>
        <ForceGraph2D
          graphData={graphData}
          width={size.w}
          height={size.h}
          nodeLabel={(n: any) => (n.name === '📍' ? 'Current' : n.name)}
          nodeColor={() => '#d97706'}
          nodeVal={(n: any) => n.val}
          linkColor={() => '#e7e5e4'}
          enableZoom={false}
          enablePanDrag={false}
          enableNodeDrag={false}
        />
      </div>
      <div className="absolute bottom-1 right-2 text-[10px] text-stone-300 group-hover:text-amber-600">
        {graphData.nodes.length - 1} related &rarr;
      </div>
    </div>
  )
}
