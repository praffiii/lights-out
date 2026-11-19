import { type CSSProperties, type RefObject, useEffect, useRef } from 'react'

import { place, runWhileSeen } from '#/chapter/hud.ts'
import type { Replay } from '#/circuits/Circuit.tsx'
import { REDUCED } from '#/motion/motion.ts'
import { advance, pointAt } from '#/pole/replay.ts'

import { chipText, type MonzaRun, runAt } from './monza-run.ts'

const TRAIL = 9

const TRAIL_STEP = 0.004

const GAP = 12

const fade = (k: number): CSSProperties & Record<'--k', number> => ({ '--k': k })

type Props = { run: MonzaRun; stage: RefObject<HTMLDivElement | null>; replay: Replay; ready: boolean }

export function RunHud({ run, stage, replay, ready }: Props) {
  const hud = useRef<HTMLDivElement>(null)
  const still = REDUCED ? run.time : 0

  useEffect(() => {
    const el = stage.current
    const root = hud.current

    if (!el || !root) return

    const dots = [...root.querySelectorAll('.car i')]
    const chip = root.querySelector<HTMLElement>('.chip')
    let state = { t: still, hold: 0 }

    const draw = (_time: number, deltaMs: number) => {
      const trace = replay.trace.current

      if (!trace) return

      if (!REDUCED) state = advance(state, deltaMs / 1000, run.time)

      const { u, done } = runAt(run, state.t)

      for (const [i, dot] of dots.entries()) {
        const p = pointAt(trace, u - TRAIL_STEP * i)

        place(dot, p.x, p.y)
      }

      if (chip) {
        const text = chipText(run, state.t)

        if (chip.textContent !== text) chip.textContent = text

        const head = pointAt(trace, u)
        const w = chip.offsetWidth
        const h = chip.offsetHeight
        const right = head.x + GAP
        const left = head.x - GAP - w
        const x = done ? (left < 0 ? right : left) : right + w > el.clientWidth ? left : right
        const above = head.y - GAP - h

        place(chip, x, above < 0 ? head.y + GAP : above)
      }

      root.toggleAttribute('data-on', true)
    }

    return runWhileSeen(el, replay, draw)
  }, [run, stage, replay, ready, still])

  return (
    <div className="run-hud" ref={hud} aria-hidden>
      <div className="car">
        {Array.from({ length: TRAIL }, (_, i) => (
          <i key={i} className={i === 0 ? 'head' : undefined} style={fade(i)} />
        ))}
      </div>
      <span className="mono chip">{chipText(run, still)}</span>
    </div>
  )
}
