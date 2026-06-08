import { useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import initRunnerFn from 't-rex-runner/dist/runner.js'

export function TrexRunner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const runnerRef = useRef<any>(null)
  const initRef = useRef(false)
  const { user } = useAuth()
  const submittedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container || initRef.current) return
    initRef.current = true

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
      // Read score from distanceMeter digits array
      const dm = r.distanceMeter
      const score = dm?.digits ? parseInt(dm.digits.join(''), 10) : Math.floor(r.distanceRan * 0.025)

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
