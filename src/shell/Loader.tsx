import { useEffect, useRef, useState } from 'react'

import { enter, gsap, REDUCED } from '#/motion/motion.ts'

const progress = { total: 0, done: 0 }

export function waitFor(...tasks: ReadonlyArray<Promise<unknown>>) {
  const settle = () => {
    progress.done += 1
  }

  for (const task of tasks) {
    progress.total += 1
    void task.then(settle, settle)
  }
}

const LIGHTS = [0, 1, 2, 3, 4]

const STEP_S = 0.14

const HOLD_S = 0.2

const HOLD_SPREAD_S = 0.3

const BEAT_S = 0.18

const LIFT_S = 0.7

const BUDGET_MS = 2600

const CAP_MS = BUDGET_MS - (STEP_S + HOLD_S + HOLD_SPREAD_S + BEAT_S + LIFT_S) * 1000

export function Loader() {
  const [lit, setLit] = useState(0)
  const [out, setOut] = useState(false)
  const [gone, setGone] = useState(false)
  const [pct, setPct] = useState(0)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (REDUCED) {
      enter()
      setGone(true)

      return
    }

    waitFor(document.fonts.ready)

    let shown = 0
    let call: gsap.core.Tween | undefined

    const step = () => {
      const share = progress.total === 0 ? 1 : progress.done / progress.total
      const late = performance.now() > CAP_MS

      setPct(Math.round(share * 100))

      if (late || shown < Math.ceil(share * 5)) {
        shown = late ? 5 : shown + 1
        setLit(shown)
      }

      if (shown < 5) {
        call = gsap.delayedCall(STEP_S, step)

        return
      }

      call = gsap.delayedCall(HOLD_S + Math.random() * HOLD_SPREAD_S, () => {
        setOut(true)
        call = gsap.delayedCall(BEAT_S, () => {
          enter()
          gsap.to(root.current, {
            clipPath: 'inset(0% 0% 100% 0%)',
            duration: LIFT_S,
            ease: 'launch',
            onComplete: () => setGone(true),
          })
        })
      })
    }

    call = gsap.delayedCall(STEP_S, step)

    return () => void call?.kill()
  }, [])

  if (gone) return null

  return (
    <div className="loader" ref={root} role="status" aria-label="Loading">
      <div className="lights" aria-hidden>
        {LIGHTS.map((i) => (
          <i key={i} className={!out && i < lit ? 'on' : undefined} />
        ))}
      </div>
      <p className="mono muted">{out ? 'Lights out' : `Loading · ${pct}%`}</p>
    </div>
  )
}
