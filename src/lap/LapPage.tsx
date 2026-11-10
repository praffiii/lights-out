import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect } from 'react'

import { circuitFor } from '#/circuits/registry.ts'
import { useShell } from '#/shell/context.ts'
import { Go } from '#/shell/Go.tsx'

export function LapPage({ circuit }: { circuit: string }) {
  const info = circuitFor(circuit)
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const { go } = useShell()

  const close = useCallback(() => {
    if (canGoBack) router.history.back()
    else void go('/weekend')
  }, [canGoBack, router, go])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }

    addEventListener('keydown', key)

    return () => removeEventListener('keydown', key)
  }, [close])

  if (!info) {
    return (
      <section className="lap missing">
        <h1 className="mono">No 3D lap for this circuit yet</h1>
        <Go to="/weekend" className="mono">
          Back to the race weekend
        </Go>
      </section>
    )
  }

  const poster = `/circuits/${info.model}`

  return (
    <section className="lap" data-mode="auto">
      <img className="poster" src={`${poster}.webp`} srcSet={`${poster}-1440.webp 1440w, ${poster}.webp 2880w`} sizes="100vw" alt={`${info.name} from above`} />
      <div className="vignette" aria-hidden />
      <div className="hud top">
        <div className="where">
          <span className="mono kicker">Lap explorer</span>
          <h1>{info.name}</h1>
          <span className="mono sub">
            {info.gp} · {info.facts.lengthKm} km · {info.facts.turns} turns
          </span>
        </div>
      </div>
      <button type="button" className="close" aria-label="Close" onClick={close}>
        <i aria-hidden />
      </button>
    </section>
  )
}
