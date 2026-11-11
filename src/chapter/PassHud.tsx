import { type RefObject, useEffect, useRef } from 'react'

import type { Replay } from '#/circuits/Circuit.tsx'
import { gsap, onEnter } from '#/motion/motion.ts'
import { MARKS } from '#/pass/interlagos.ts'
import { readout } from '#/pass/model.ts'
import type { PassFile } from '#/pass/schema.ts'
import { pointAt } from '#/pole/replay.ts'

const SIDE_PX = 9
const SPREAD_M = 40
const SIDE_M = 3.5
const SEGMENT_STEP = 0.0015
const LEAD = 0.03
const TANGENT = 0.001
const TRAIL_U = 0.03
const SEGS = 12
const TRAIL_W = 11
const GATE_PX = 26
const CHIP_PX = 36

type Props = { pass: PassFile; stage: RefObject<HTMLDivElement | null>; replay: Replay; time: RefObject<number>; ready: boolean }

const place = (el: Element | null | undefined, x: number, y: number) => {
  if (el instanceof HTMLElement || el instanceof SVGElement) el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`
}

const normalAt = (trace: Float32Array, u: number) => {
  const a = pointAt(trace, u - TANGENT)
  const b = pointAt(trace, u + TANGENT)
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1

  return { nx: (b.y - a.y) / len, ny: -(b.x - a.x) / len, len }
}

const gate = (el: Element | null | undefined, trace: Float32Array, u: number) => {
  if (!(el instanceof SVGLineElement)) return

  const p = pointAt(trace, u)
  const { nx, ny } = normalAt(trace, u)

  el.setAttribute('x1', (p.x - nx * GATE_PX).toFixed(1))
  el.setAttribute('y1', (p.y - ny * GATE_PX).toFixed(1))
  el.setAttribute('x2', (p.x + nx * GATE_PX).toFixed(1))
  el.setAttribute('y2', (p.y + ny * GATE_PX).toFixed(1))
}

const path = (trace: Float32Array, from: number, to: number, step: number) => {
  const points: string[] = []

  for (let u = from; u <= to; u += step) {
    const p = pointAt(trace, u)

    points.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`)
  }

  return points.join(' ')
}

export function PassHud({ pass, stage, replay, time, ready }: Props) {
  const hud = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = stage.current
    const root = hud.current

    if (!el || !root) return

    const line = root.querySelector('.line')
    const gates = { detection: root.querySelector('[data-gate="detection"]'), finish: root.querySelector('[data-gate="finish"]') }
    const tags = { detection: root.querySelector('[data-tag="detection"]'), finish: root.querySelector('[data-tag="finish"]') }
    const trails = { chaser: [...root.querySelectorAll('[data-trail="chaser"] line')], leader: [...root.querySelectorAll('[data-trail="leader"] line')] }
    const cars = { chaser: root.querySelector('[data-car="chaser"]'), leader: root.querySelector('[data-car="leader"]') }
    const gap = root.querySelector('.gap')
    const gapText = gap?.querySelector('b')
    let seen = false
    let entered = false
    let ticking = false

    const draw = () => {
      const trace = replay.trace.current

      root.toggleAttribute('data-on', trace !== null)

      if (!trace) return

      const now = readout(pass, time.current)

      line?.setAttribute('points', path(trace, MARKS.detection - LEAD, MARKS.apex, SEGMENT_STEP))
      gate(gates.detection, trace, MARKS.detection)
      gate(gates.finish, trace, 1)

      for (const key of ['detection', 'finish'] as const) {
        const u = key === 'detection' ? MARKS.detection : 1
        const p = pointAt(trace, u)
        const { nx, ny } = normalAt(trace, u)

        place(tags[key], p.x + nx * (GATE_PX + 8), p.y + ny * (GATE_PX + 8))
      }

      root.toggleAttribute('data-armed', now.u.chaser >= MARKS.detection)

      const mid = (now.u.chaser + now.u.leader) / 2
      const { nx, ny, len } = normalAt(trace, mid)
      const perM = len / (2 * TANGENT * pass.lengthM)
      const near = Math.abs(now.u.chaser - now.u.leader) * pass.lengthM < SPREAD_M
      const side = near ? Math.max(SIDE_PX, SIDE_M * perM) : 0

      for (const [car, sign] of [
        ['chaser', 1],
        ['leader', -1],
      ] as const) {
        const u = now.u[car]
        const p = pointAt(trace, u)
        const x = p.x + nx * side * sign
        const y = p.y + ny * side * sign
        const chip = cars[car]?.querySelector('span')

        place(cars[car], x, y)

        if (chip instanceof HTMLElement) chip.style.translate = `${(nx * CHIP_PX * sign).toFixed(1)}px ${(ny * CHIP_PX * sign).toFixed(1)}px`

        for (const [i, seg] of trails[car].entries()) {
          const a = pointAt(trace, u - ((i + 1) * TRAIL_U) / SEGS)
          const b = pointAt(trace, u - (i * TRAIL_U) / SEGS)
          const f = 1 - i / SEGS

          seg.setAttribute('x1', (a.x + nx * side * sign).toFixed(1))
          seg.setAttribute('y1', (a.y + ny * side * sign).toFixed(1))
          seg.setAttribute('x2', (b.x + nx * side * sign).toFixed(1))
          seg.setAttribute('y2', (b.y + ny * side * sign).toFixed(1))
          seg.setAttribute('stroke-width', (TRAIL_W * f).toFixed(2))
          seg.setAttribute('stroke-opacity', (f * f).toFixed(3))
        }
      }

      const m = pointAt(trace, mid)

      place(gap, m.x - nx * (CHIP_PX + 34), m.y - ny * (CHIP_PX + 34))

      const ahead = now.chaser.gap === 'Ahead'
      const text = ahead ? `${pass.chaser.code} ahead` : now.chaser.gap

      if (gapText && gapText.textContent !== text) gapText.textContent = text
    }

    const sync = () => {
      const run = seen && entered && !document.hidden

      replay.running.current = run

      if (run === ticking) return

      ticking = run

      if (run) gsap.ticker.add(draw)
      else gsap.ticker.remove(draw)
    }

    const observer = new IntersectionObserver((entries) => {
      seen = entries.at(-1)?.isIntersecting ?? seen
      sync()
    })

    observer.observe(el)
    document.addEventListener('visibilitychange', sync)

    const off = onEnter(() => {
      entered = true
      sync()
    })

    return () => {
      off()
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      gsap.ticker.remove(draw)
      replay.running.current = false
    }
  }, [pass, stage, replay, time, ready])

  return (
    <div className="pass-hud" ref={hud} aria-hidden>
      <svg className="stretch">
        <polyline className="line" />
        <line className="gate" data-gate="detection" />
        <line className="gate finish" data-gate="finish" />
        {(['leader', 'chaser'] as const).map((car) => (
          <g key={car} className="trail" data-trail={car}>
            {Array.from({ length: SEGS }, (_, i) => (
              <line key={i} />
            ))}
          </g>
        ))}
      </svg>
      <span className="tag mono" data-tag="detection">
        Detection
      </span>
      <span className="tag mono" data-tag="finish">
        Finish line
      </span>
      <span className="racer" data-car="leader">
        <i />
        <span className="mono">{pass.leader.code}</span>
      </span>
      <span className="racer" data-car="chaser">
        <i />
        <span className="mono">{pass.chaser.code}</span>
      </span>
      <span className="gap mono">
        <i>Gap</i>
        <b>—</b>
      </span>
    </div>
  )
}
