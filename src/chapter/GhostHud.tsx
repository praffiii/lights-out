import { type RefObject, useEffect, useRef } from 'react'

import type { Replay } from '#/circuits/Circuit.tsx'
import { at, START } from '#/drs/model.ts'
import type { GhostFile } from '#/drs/schema.ts'
import { pointAt } from '#/pole/replay.ts'

import { normalAt, paintTrail, place, runWhileSeen, TRAIL_SEGS } from './hud.ts'

const TRAIL = 0.006

const CARS = ['on', 'off'] as const

const DRAWN = ['off', 'on'] as const

type Props = { file: GhostFile; gap: string; stage: RefObject<HTMLDivElement | null>; replay: Replay; time: RefObject<number>; ready: boolean }

export function GhostHud({ file, gap, stage, replay, time, ready }: Props) {
  const hud = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = stage.current
    const root = hud.current

    if (!el || !root) return

    const parts = CARS.map((car) => ({ dot: root.querySelector(`.racer[data-car="${car}"]`), trail: [...root.querySelectorAll(`[data-trail="${car}"] line`)] }))
    const chip = root.querySelector('.gap')

    const draw = () => {
      const trace = replay.trace.current

      root.toggleAttribute('data-on', trace !== null)

      if (!trace) return

      const { laps } = at(file, time.current + START)

      for (const [i, part] of parts.entries()) {
        const u = laps[i === 0 ? 0 : 1].u
        const p = pointAt(trace, u)

        place(part.dot, p.x, p.y)
        paintTrail(part.trail, trace, u, 0, 0, TRAIL)
      }

      const u = (laps[0].u + laps[1].u) / 2
      const m = pointAt(trace, u)
      const { nx, ny } = normalAt(trace, u)
      const below = ny < 0 ? -1 : 1

      place(chip, m.x + nx * below, m.y + ny * below)
    }

    return runWhileSeen(el, replay, draw)
  }, [file, stage, replay, time, ready])

  return (
    <div className="pass-hud" ref={hud} aria-hidden>
      <svg className="stretch">
        {DRAWN.map((car) => (
          <g key={car} className="trail" data-trail={car}>
            {Array.from({ length: TRAIL_SEGS }, (_, i) => (
              <line key={i} />
            ))}
          </g>
        ))}
      </svg>
      <span className="racer" data-car="off">
        <i />
        <span className="mono">{`Ghost · L${file.laps[1].lap}`}</span>
      </span>
      <span className="racer" data-car="on">
        <i />
        <span className="mono">
          {`${file.driver.code} · `}
          <span className="wide">Lap </span>
          <span className="tight">L</span>
          {file.laps[0].lap}
        </span>
      </span>
      <span className="gap">
        <i className="mono">Ahead by</i>
        <b>{gap}</b>
      </span>
    </div>
  )
}
