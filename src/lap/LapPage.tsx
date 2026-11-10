import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { CircuitGuard } from '#/circuits/CircuitGuard.tsx'
import { circuitFor } from '#/circuits/registry.ts'
import { useMounted } from '#/motion/client.ts'
import { useShell } from '#/shell/context.ts'
import { Go } from '#/shell/Go.tsx'

const Explorer = lazy(() => import('./Explorer.tsx'))

export function LapPage({ circuit }: { circuit: string }) {
  const info = circuitFor(circuit)
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const { go } = useShell()
  const mounted = useMounted()
  const stage = useRef<HTMLElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const shown = useCallback(() => setReady(true), [])
  const broke = useCallback(() => setFailed(true), [])

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
    <section className="lap" ref={stage} data-mode="auto" data-ready={ready && !failed ? '' : undefined}>
      <img className="poster" src={`${poster}.webp`} srcSet={`${poster}-1440.webp 1440w, ${poster}.webp 2880w`} sizes="100vw" alt={`${info.name} from above`} />
      <div className="vignette" aria-hidden />
      {mounted && !failed ? (
        <CircuitGuard onError={broke}>
          <Suspense fallback={null}>
            <Explorer info={info} stage={stage} onReady={shown} onFail={broke} />
          </Suspense>
        </CircuitGuard>
      ) : null}
      {failed ? <p className="mono note">The 3D lap could not load.</p> : null}
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
