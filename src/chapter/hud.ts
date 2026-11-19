import type { Replay } from '#/circuits/Circuit.tsx'
import { gsap, onEnter } from '#/motion/motion.ts'

export const place = (el: Element | null | undefined, x: number, y: number) => {
  if (el instanceof HTMLElement || el instanceof SVGElement) el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`
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
