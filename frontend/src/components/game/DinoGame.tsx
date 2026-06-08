import { useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Runner } from '@/game/dino/offline.js'
import api from '@/services/api'

export function DinoGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const runnerRef = useRef<any>(null)
  const pollRef = useRef(0)
  const scoreRef = useRef({ last: 0, submitted: false })
  const { user } = useAuth()

  const submitScore = useCallback(async (score: number) => {
    if (!user || score <= 0 || scoreRef.current.submitted) return
    scoreRef.current.submitted = true
    try { await api.post('/scores', { score: Math.floor(score) }) } catch {}
  }, [user])

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    // Sprite images are pre-loaded in index.html. Give them a moment to load.
    const init = () => {
      if (cancelled) return
      const runner = new Runner(container)
      runnerRef.current = runner

      // Tune difficulty: faster acceleration, narrower obstacle gaps
      runner.config.ACCELERATION = 0.005
      runner.config.GAP_COEFFICIENT = 0.25
      runner.config.MAX_SPEED = 15
      runner.config.CLEAR_TIME = 1500
      // Night mode: switch every 25m, 3s night phases (verify it works)
      runner.config.INVERT_DISTANCE = 25
      runner.config.INVERT_FADE_DURATION = 3000

      pollRef.current = window.setInterval(() => {
        // Read the actual displayed score from the distance meter
        const dm = runner.distanceMeter
        const score = dm?.digits ? parseInt(dm.digits.join(''), 10) : Math.floor(runner.distanceRan * 0.025)
        if (runner.crashed && score > 0 && !scoreRef.current.submitted) {
          submitScore(score)
          scoreRef.current.last = score
        }
        if (score === 0 && runner.playing) {
          scoreRef.current.submitted = false
          scoreRef.current.last = 0
        }
      }, 300)
    }

    // Wait for sprite image to load before initializing game
    const sprite = document.getElementById('offline-resources-1x') as HTMLImageElement | null
    if (sprite?.complete) {
      init()
    } else if (sprite) {
      sprite.addEventListener('load', init, { once: true })
      setTimeout(() => { if (!runnerRef.current) init() }, 3000)
    } else {
      init()
    }

    return () => {
      cancelled = true
      clearInterval(pollRef.current)
      if (runnerRef.current) {
        runnerRef.current.destroy()
        runnerRef.current = null
      }
    }
  }, [submitScore])

  // Click handler: focus game's inner container so keyboard input works
  const handleWrapperClick = useCallback(() => {
    setTimeout(() => {
      const inner = containerRef.current?.querySelector('.runner-container') as HTMLElement | null
      inner?.focus()
    }, 0)
  }, [])

  return (
    <div className="w-full max-w-[640px] mx-auto bg-white select-none rounded-lg overflow-hidden border border-[var(--color-border)]" onClick={handleWrapperClick}>
      <div ref={containerRef} style={{ height: 204, width: 900, marginLeft: 0 }} />
      <p className="text-center text-xs text-[var(--color-text-muted)] py-2 bg-[var(--color-surface)]/50">
        点击游戏区域后按空格键开始
      </p>
    </div>
  )
}
