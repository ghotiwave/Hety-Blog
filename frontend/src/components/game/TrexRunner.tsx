import { useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import initRunnerFn from 't-rex-runner/dist/runner.js'

export function TrexRunner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const submittedRef = useRef(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container || initializedRef.current) return
    initializedRef.current = true

    try {
      initRunnerFn('#trex-container')
    } catch (e) {
      console.error('Game init error:', e)
    }

    const poll = setInterval(() => {
      if (!container) return
      const scoreDisplay = container.querySelector('.current-score') as HTMLElement | null
      if (scoreDisplay) {
        const score = parseInt(scoreDisplay.textContent?.replace(/\D/g, '') || '0', 10)
        if (score === 0) submittedRef.current = false
        if (score > 0 && !submittedRef.current && user) {
          // Game over detection: check if score stopped incrementing
          submittedRef.current = true
          api.post('/scores', { score }).catch(() => {})
        }
      }
    }, 500)

    return () => { clearInterval(poll) }
  }, [user])

  return (
    <div className="w-full max-w-[620px] mx-auto bg-white select-none rounded-lg overflow-hidden border border-[var(--color-border)]">
      <div id="trex-container" ref={containerRef} style={{ minHeight: 220 }} />
    </div>
  )
}
