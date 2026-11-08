import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import Lenis from 'lenis'

gsap.registerPlugin(CustomEase)
CustomEase.create('launch', 'M0,0 C0.8,0 0.15,1 1,1')
CustomEase.create('brake', 'M0,0 C0.05,0.7 0.1,1 1,1')

/** Top speed (km/h) of each of the eight gears. */
const GEAR_TOP = [70, 110, 150, 190, 230, 265, 300, 335]
const TOP_KMH = GEAR_TOP[GEAR_TOP.length - 1]
/** Smoothed scroll velocity (px per frame) that counts as flat out. */
const FLAT_OUT_VELOCITY = 42

export type Frame = { time: number; dt: number }

/** The one clock. Everything that carries the concept reads from here. */
export const drive = {
  progress: 0,
  speed: 0,
  kmh: 0,
  gear: 0,
  rpm: 0,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
}

const subscribers = new Set<(frame: Frame) => void>()

export function onFrame(fn: (frame: Frame) => void) {
  subscribers.add(fn)
  return () => void subscribers.delete(fn)
}

let lenis: Lenis | null = null

export function startDrive() {
  history.scrollRestoration = 'manual'
  window.scrollTo(0, 0)
  const root = document.documentElement
  if (!drive.reduced) {
    lenis = new Lenis({ lerp: 0.085 })
    lenis.stop()
  }

  const tick = (time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs, 100) / 1000
    lenis?.raf(time * 1000)
    const max = root.scrollHeight - innerHeight
    drive.progress = lenis ? lenis.progress : max > 0 ? scrollY / max : 0

    const target = lenis ? Math.min(1, Math.abs(lenis.velocity) / FLAT_OUT_VELOCITY) : 0
    // Throttle bites fast; the brake arrives fast and settles long.
    const rate = target > drive.speed ? 7 : 1.6
    drive.speed += (target - drive.speed) * (1 - Math.exp(-rate * dt))
    drive.kmh = drive.speed * TOP_KMH

    const index = GEAR_TOP.findIndex((top) => drive.kmh < top)
    const g = index === -1 ? GEAR_TOP.length - 1 : index
    drive.gear = drive.kmh < 2 ? 0 : g + 1
    const low = g === 0 ? 0 : GEAR_TOP[g - 1]
    drive.rpm = drive.gear === 0 ? 0.15 : 0.45 + 0.55 * Math.min(1, (drive.kmh - low) / (GEAR_TOP[g] - low))

    root.style.setProperty('--wdth', drive.reduced ? '100' : (62 + drive.speed * 63).toFixed(1))
    for (const fn of subscribers) fn({ time, dt })
  }

  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => {
    gsap.ticker.remove(tick)
    lenis?.destroy()
    lenis = null
  }
}

/** Lights out: unlock the scroll and launch down the straight. */
export function release(distance: number) {
  if (!lenis) return
  lenis.start()
  lenis.scrollTo(distance, { duration: 1.8, easing: gsap.parseEase('launch') })
}
