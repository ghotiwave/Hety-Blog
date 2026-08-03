import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback': () => void
          'error-callback': () => void
        },
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  const loading = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('turnstile-script') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile load failed')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = 'turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Turnstile load failed')), { once: true })
    document.head.appendChild(script)
  })
  scriptPromise = loading.catch((error) => {
    scriptPromise = null
    throw error
  })
  return scriptPromise
}

interface Props {
  siteKey: string
  onTokenChange: (token: string) => void
  onError: () => void
}

export function TurnstileWidget({ siteKey, onTokenChange, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tokenCallbackRef = useRef(onTokenChange)
  const errorCallbackRef = useRef(onError)

  useEffect(() => {
    tokenCallbackRef.current = onTokenChange
    errorCallbackRef.current = onError
  }, [onError, onTokenChange])

  useEffect(() => {
    if (!siteKey) return
    let cancelled = false
    let widgetId: string | null = null
    loadTurnstileScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => tokenCallbackRef.current(token),
        'expired-callback': () => tokenCallbackRef.current(''),
        'error-callback': () => {
          tokenCallbackRef.current('')
          errorCallbackRef.current()
        },
      })
    }).catch(() => errorCallbackRef.current())
    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [siteKey])

  return <div ref={containerRef} className="flex min-h-[65px] justify-center" />
}
