import type { Replay } from '#/circuits/Circuit.tsx'
import { gsap, onEnter } from '#/motion/motion.ts'
import { pointAt } from '#/pole/replay.ts'

export const TANGENT = 0.001

export const TRAIL_SEGS = 12

const TRAIL_U = 0.03

const TRAIL_W = 11

export const place = (el: Element | null | undefined, x: number, y: number) => {
  if (el instanceof HTMLElement || el instanceof SVGElement) el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`
}

export const normalAt = (trace: Float32Array, u: number) => {
  const a = pointAt(trace, u - TANGENT)
  const b = pointAt(trace, u + TANGENT)
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1

  return { nx: (b.y - a.y) / len, ny: -(b.x - a.x) / len, len }
}

export function paintTrail(segs: ReadonlyArray<Element>, trace: Float32Array, u: number, dx: number, dy: number) {
  for (const [i, seg] of segs.entries()) {
    const a = pointAt(trace, u - ((i + 1) * TRAIL_U) / TRAIL_SEGS)
    const b = pointAt(trace, u - (i * TRAIL_U) / TRAIL_SEGS)
    const f = 1 - i / TRAIL_SEGS

    seg.setAttribute('x1', (a.x + dx).toFixed(1))
    seg.setAttribute('y1', (a.y + dy).toFixed(1))
    seg.setAttribute('x2', (b.x + dx).toFixed(1))
    seg.setAttribute('y2', (b.y + dy).toFixed(1))
    seg.setAttribute('stroke-width', (TRAIL_W * f).toFixed(2))
    seg.setAttribute('stroke-opacity', (f * f).toFixed(3))
  }
}

export function runWhileSeen(el: Element, replay: Replay, draw: (time: number, deltaMs: number) => void) {
  let seen = false
  let entered = false
  let ticking = false

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
}
