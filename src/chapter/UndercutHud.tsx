import { type RefObject, useEffect, useRef } from 'react'

import type { Replay } from '#/circuits/Circuit.tsx'
import { pointAt } from '#/pole/replay.ts'
import { ageText, carAt, tyreAt, type Which } from '#/tyres/model.ts'
import type { UndercutFile } from '#/tyres/schema.ts'

import { place, runWhileSeen } from './hud.ts'

const CARS = ['early', 'late'] as const

const TAG_PX = 14

type Props = { file: UndercutFile; stage: RefObject<HTMLDivElement | null>; replay: Replay; time: RefObject<number>; ready: boolean }

const wrap = (u: number) => u - Math.floor(u)

const along = (trace: Float32Array, f: number) => {
  const last = trace.length / 2 - 1
  const at = Math.min(last, Math.max(0, f * last))
  const i = Math.min(last - 1, Math.floor(at))
  const k = at - i

  return { x: (trace[i * 2] ?? 0) * (1 - k) + (trace[i * 2 + 2] ?? 0) * k, y: (trace[i * 2 + 1] ?? 0) * (1 - k) + (trace[i * 2 + 3] ?? 0) * k }
}

const polyline = (trace: Float32Array) => {
  const points: string[] = []

  for (let i = 0; i < trace.length; i += 2) points.push(`${(trace[i] ?? 0).toFixed(1)},${(trace[i + 1] ?? 0).toFixed(1)}`)

  return points.join(' ')
}

const chipText = (file: UndercutFile, which: Which, t: number) => {
  const tyre = tyreAt(file[which], t)
  const name = tyre.compound.charAt(0) + tyre.compound.slice(1).toLowerCase()

  return `${name} · ${ageText(tyre.age)}`
}

export function UndercutHud({ file, stage, replay, time, ready }: Props) {
  const hud = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = stage.current
    const root = hud.current

    if (!el || !root) return

    const lane = root.querySelector('.lane')
    const tag = root.querySelector('[data-tag="pit"]')
    const cars = CARS.map((which) => ({ which, dot: root.querySelector(`[data-car="${which}"]`), chip: root.querySelector(`[data-car="${which}"] em`) }))

    const draw = () => {
      const trace = replay.trace.current
      const pit = replay.pit?.trace.current

      root.toggleAttribute('data-on', trace !== null)

      if (!trace) return

      const t = time.current

      if (pit) {
        lane?.setAttribute('points', polyline(pit))

        const mid = along(pit, 0.5)

        place(tag, mid.x + TAG_PX, mid.y - TAG_PX)
      }

      for (const car of cars) {
        const spot = carAt(file[car.which], t)
        const p = spot.lane !== null && pit ? along(pit, spot.lane) : pointAt(trace, wrap(spot.u))
        const text = chipText(file, car.which, t)

        place(car.dot, p.x, p.y)

        if (car.chip && car.chip.textContent !== text) car.chip.textContent = text
      }
    }

    return runWhileSeen(el, replay, draw)
  }, [file, stage, replay, time, ready])

  return (
    <div className="undercut-hud" ref={hud} aria-hidden>
      <svg className="stretch">
        <polyline className="lane" />
      </svg>
      <span className="tag mono" data-tag="pit">
        Pit lane
      </span>
      {CARS.map((which) => (
        <span key={which} className="racer" data-car={which}>
          <i />
          <span className="mono">
            <b>{file[which].code}</b>
            <em />
          </span>
        </span>
      ))}
    </div>
  )
}
