import { useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import initRunnerFn from 't-rex-runner/dist/runner.js'

export function TrexRunner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const runnerRef = useRef<any>(null)
  const { user } = useAuth()
  const submittedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // Prevent double-init in React strict mode
    if (container.querySelector('.interstitial-wrapper')) return

    try {
      const runner = initRunnerFn('#trex-container')
      runnerRef.current = runner
    } catch (e) {
      console.error('Game init error:', e)
      return
    }

    const poll = setInterval(() => {
      const r = runnerRef.current
      if (!r) return
      // Read score from the game's internal distanceMeter
      const dm = r.distanceMeter || r._distanceMeter
      const digits = dm?.digits
      const score = digits ? parseInt(digits.join(''), 10) : 0

      if (score === 0) submittedRef.current = false
      if (r.crashed && score > 0 && !submittedRef.current && user) {
        submittedRef.current = true
        api.post('/scores', { score }).catch(() => {})
      }
    }, 500)

    return () => { clearInterval(poll) }
  }, [user])

  return (
    <div className="w-full max-w-[640px] mx-auto bg-white select-none rounded-lg overflow-hidden border border-[var(--color-border)]">
      <div id="trex-container" ref={containerRef} style={{ minHeight: 224 }} />
    </div>
  )
}
