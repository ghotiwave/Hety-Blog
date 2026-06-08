import { useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import 't-rex-runner/dist/runner.js'

export function TrexRunner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const submittedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const t = setTimeout(() => {
      const fn = (window as any).initRunner
      if (typeof fn === 'function') {
        fn('#trex-container')
      }
    }, 200)

    const poll = setInterval(() => {
      if (!container) return
      const scoreDisplay = container.querySelector('.current-score') as HTMLElement | null
      if (scoreDisplay) {
        const score = parseInt(scoreDisplay.textContent?.replace(/\D/g, '') || '0', 10)
        if (score === 0) submittedRef.current = false
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
    </div>
  )
}
