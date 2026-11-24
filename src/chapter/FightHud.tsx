import { type RefObject, useEffect, useRef } from 'react'

import type { Replay } from '#/circuits/Circuit.tsx'
import { type Lead, readout } from '#/fight/model.ts'
import type { FightFile } from '#/fight/schema.ts'
import { CAR_M } from '#/pass/model.ts'
import { pointAt } from '#/pole/replay.ts'

import { normalAt, paintTrail, place, runWhileSeen, TANGENT, TRAIL_SEGS } from './hud.ts'

const SIDE_PX = 9

const SIDE_M = 3.5

const PART_M = 14

const CHIP_PX = 40

const GAP_PX = 94

const CARS = [
  [0, 1],
  [1, -1],
] as const

type Props = { file: FightFile; lead: ReadonlyArray<Lead>; stage: RefObject<HTMLDivElement | null>; replay: Replay; time: RefObject<number>; ready: boolean }

export function FightHud({ file, lead, stage, replay, time, ready }: Props) {
  const hud = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = stage.current
    const root = hud.current

    if (!el || !root) return

    const parts = file.cars.map((c) => ({ dot: root.querySelector(`.racer[data-car="${c.code}"]`), trail: [...root.querySelectorAll(`[data-trail="${c.code}"] line`)] }))
    const gap = root.querySelector('.gap')
    const gapText = gap?.querySelector('b')

    const draw = () => {
      const trace = replay.trace.current

      root.toggleAttribute('data-on', trace !== null)

      if (!trace) return

      const { leader, rows } = readout(file, lead, time.current)
      const mid = (rows[0].u + rows[1].u) / 2
      const { nx, ny, len } = normalAt(trace, mid)
      const apart = Math.abs(rows[0].u - rows[1].u) * file.lengthM
      const beside = Math.min(1, Math.max(0, (PART_M - apart) / (PART_M - CAR_M)))
      const side = beside * Math.max(SIDE_PX, (SIDE_M * len) / (2 * TANGENT * file.lengthM))

      for (const [who, sign] of CARS) {
        const { u } = rows[who]
        const part = parts[who]
        const p = pointAt(trace, u)
        const n = normalAt(trace, u)
        const chip = part?.dot?.querySelector('span')

        place(part?.dot, p.x + nx * side * sign, p.y + ny * side * sign)

        if (chip instanceof HTMLElement) chip.style.translate = `${(n.nx * CHIP_PX * sign).toFixed(1)}px ${(n.ny * CHIP_PX * sign).toFixed(1)}px`

        paintTrail(part?.trail ?? [], trace, u, nx * side * sign, ny * side * sign)
      }

      const m = pointAt(trace, mid)

      place(gap, m.x, m.y - GAP_PX)

      const text = rows[leader === 0 ? 1 : 0].gap

      if (gapText && gapText.textContent !== text) gapText.textContent = text
    }

    return runWhileSeen(el, replay, draw)
  }, [file, lead, stage, replay, time, ready])

  return (
    <div className="pass-hud" ref={hud} aria-hidden>
      <svg className="stretch">
        {file.cars.map((c) => (
          <g key={c.code} className="trail" data-trail={c.code}>
            {Array.from({ length: TRAIL_SEGS }, (_, i) => (
              <line key={i} />
            ))}
          </g>
        ))}
      </svg>
      {file.cars.map((c) => (
        <span key={c.code} className="racer" data-car={c.code}>
          <i />
          <span className="mono">{c.code}</span>
        </span>
      ))}
      <span className="gap mono">
        <i>Gap</i>
        <b>—</b>
      </span>
    </div>
  )
}
