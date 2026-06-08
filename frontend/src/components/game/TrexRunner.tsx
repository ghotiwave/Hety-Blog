import { useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import initRunnerFn from 't-rex-runner/dist/runner.js'

export function TrexRunner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const submittedRef = useRef(false)
  const destroyedRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clean up previous game if any
    const old = container.querySelector('.interstitial-wrapper')
    if (old) container.innerHTML = ''

    let runner: any = null
    try {
      runner = initRunnerFn('#trex-container')
    } catch (e) {
      console.error('Game init error:', e)
      return
    }

    const poll = setInterval(() => {
      if (!runner || destroyedRef.current) return
      const dm = runner.distanceMeter
      const score = dm?.digits ? parseInt(dm.digits.join(''), 10) : Math.floor(runner.distanceRan * 0.025)

      if (score === 0) submittedRef.current = false
      if (runner.crashed && score > 0 && !submittedRef.current && user) {
        submittedRef.current = true
        api.post('/scores', { score }).catch(() => {})
      }
    }, 500)

    return () => {
      destroyedRef.current = true
      clearInterval(poll)
      try { runner?.destroy?.() } catch {}
      if (container) container.innerHTML = ''
      // Re-allow init on next mount
      setTimeout(() => { destroyedRef.current = false }, 100)
    }
  }, [user])

  return (
    <div className="w-full max-w-[640px] mx-auto bg-white select-none rounded-lg overflow-hidden border border-[var(--color-border)]">
      <div id="trex-container" ref={containerRef} style={{ minHeight: 224 }} />
    </div>
  )
}
