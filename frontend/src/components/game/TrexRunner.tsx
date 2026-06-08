import { useRef, useEffect, useCallback, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'

let initFn: any = null
try { initFn = require('t-rex-runner') } catch {}

export function TrexRunner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const submittedRef = useRef(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const t = setTimeout(() => {
      const fn = (window as any).initRunner || initFn
      if (typeof fn === 'function') {
        fn('#trex-container')
        setLoaded(true)
      }
    }, 300)

    const poll = setInterval(() => {
      if (!container) return
      const scoreDisplay = container.querySelector('.current-score') as HTMLElement | null
      if (scoreDisplay) {
        const score = parseInt(scoreDisplay.textContent?.replace(/\D/g, '') || '0', 10)
        // If score just reset to 0, allow submitting again
        if (score === 0) submittedRef.current = false
        // Game over: score > 0 and game stopped
        const wrapper = container.querySelector('.interstitial-wrapper')
        const gameOver = wrapper && !wrapper.classList.contains('active')
        if (score > 0 && gameOver && !submittedRef.current && user) {
          submittedRef.current = true
          api.post('/scores', { score }).catch(() => {})
        }
      }
    }, 500)

    return () => { clearTimeout(t); clearInterval(poll) }
  }, [user])

  return (
    <div className="w-full max-w-[620px] mx-auto bg-white select-none rounded-lg overflow-hidden border border-[var(--color-border)]">
      <div id="trex-container" ref={containerRef} style={{ minHeight: 220 }} />
      {!loaded && <p className="text-center text-xs text-[var(--color-text-muted)] pb-3">加载中...</p>}
    </div>
  )
}
