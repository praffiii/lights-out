import { type RefObject, useEffect, useRef } from 'react'

import type { Replay } from '#/circuits/Circuit.tsx'
import { gsap, onEnter } from '#/motion/motion.ts'
import { MARKS } from '#/pass/interlagos.ts'
import { CAR_M, readout } from '#/pass/model.ts'
import type { PassFile } from '#/pass/schema.ts'
import { pointAt } from '#/pole/replay.ts'

const SIDE_PX = 6
const SIDE_M = 3.5
const SEGMENT_STEP = 0.002
const LEAD = 0.03
const TANGENT = 0.001

type Props = { pass: PassFile; stage: RefObject<HTMLDivElement | null>; replay: Replay; time: RefObject<number>; ready: boolean }

const place = (el: Element | null | undefined, x: number, y: number) => {
  if (el instanceof HTMLElement || el instanceof SVGElement) el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`
}

export function PassHud({ pass, stage, replay, time, ready }: Props) {
  const hud = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = stage.current
    const root = hud.current

    if (!el || !root) return

    const line = root.querySelector('polyline')
    const detection = root.querySelector('[data-mark="detection"]')
    const finish = root.querySelector('[data-mark="finish"]')
    const chaser = root.querySelector('[data-car="chaser"]')
    const leader = root.querySelector('[data-car="leader"]')
    let seen = false
    let entered = false
    let ticking = false

    const draw = () => {
      const trace = replay.trace.current

      root.toggleAttribute('data-on', trace !== null)

      if (!trace) return

      const now = readout(pass, time.current)
      const points: string[] = []

      for (let u = MARKS.detection - LEAD; u <= MARKS.apex; u += SEGMENT_STEP) {
        const p = pointAt(trace, u)

        points.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      }

      line?.setAttribute('points', points.join(' '))

      const d = pointAt(trace, MARKS.detection)
      const f = pointAt(trace, 1)

      place(detection, d.x, d.y)
      place(finish, f.x, f.y)
      detection?.toggleAttribute('data-on', now.u.chaser >= MARKS.detection)

      const mid = (now.u.chaser + now.u.leader) / 2
      const a = pointAt(trace, mid - TANGENT)
      const b = pointAt(trace, mid + TANGENT)
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const perM = len / (2 * TANGENT * pass.lengthM)
      const side = Math.abs(now.u.chaser - now.u.leader) * pass.lengthM < CAR_M ? Math.max(SIDE_PX, SIDE_M * perM) : 0
      const nx = ((b.y - a.y) / len) * side
      const ny = (-(b.x - a.x) / len) * side
      const c = pointAt(trace, now.u.chaser)
      const l = pointAt(trace, now.u.leader)

      place(chaser, c.x + nx, c.y + ny)
      place(leader, l.x - nx, l.y - ny)
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
        <polyline />
      </svg>
      <span className="mark mono" data-mark="detection">
        Detection
      </span>
      <span className="mark mono" data-mark="finish">
        Start / finish
      </span>
      <span className="dot" data-car="leader">
        <span className="mono">{`Leader · ${pass.leader.code}`}</span>
      </span>
      <span className="dot" data-car="chaser">
        <span className="mono">{`Chaser · ${pass.chaser.code}`}</span>
      </span>
    </div>
  )
}
