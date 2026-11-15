import { useLenis } from 'lenis/react'
import { type RefObject, useLayoutEffect, useRef } from 'react'

import { gsap, REDUCED, ScrollTrigger, useGSAP } from '#/motion/motion.ts'

import { nextStop, type Pace, prevStop, progressAt, timeAt } from './pace.ts'

const FOLLOW = 0.1

const SETTLE = 0.002

const SNAP_PX = 2

type Paint = (scope: HTMLElement) => (t: number) => void

export type Scrub = { time: RefObject<number>; seek: RefObject<(t: number) => void> }

export function useScrub(root: RefObject<HTMLElement | null>, end: number, stops: ReadonlyArray<number>, pace: Pace, paint: Paint): Scrub {
  const time = useRef(REDUCED ? end : 0)
  const seeker = useRef<(t: number) => void>(() => {})
  const lenis = useLenis()
  const scroller = useRef(lenis)
  const painter = useRef(paint)

  useLayoutEffect(() => {
    scroller.current = lenis
    painter.current = paint
  })

  useGSAP(
    () => {
      const scope = root.current
      const pin = scope?.querySelector<HTMLElement>('.pin')
      const track = scope?.querySelector<HTMLElement>('[role="slider"]')

      if (!scope || !pin || !track) return

      const draw = painter.current(scope)
      let goal = time.current
      let target: number | null = null
      let st: ScrollTrigger | null = null

      const show = (t: number) => {
        time.current = t
        draw(t)
      }

      const follow = () => {
        const d = goal - time.current

        if (d === 0) return

        show(Math.abs(d) < SETTLE ? goal : time.current + d * (1 - (1 - FOLLOW) ** gsap.ticker.deltaRatio()))
      }

      const fromScroll = (progress: number) => {
        const t = timeAt(pace, progress)
        const span = st ? st.end - st.start : 0
        const snap = span > 0 ? (SNAP_PX * end) / span : 0

        if (target !== null && Math.abs(t - target) <= snap) {
          goal = target

          return
        }

        target = null
        goal = t
      }

      const seek = (t: number) => {
        goal = Math.min(end, Math.max(0, t))

        if (!st) return show(goal)

        target = goal

        const y = st.start + progressAt(pace, goal) * (st.end - st.start)
        const lenisNow = scroller.current

        if (lenisNow) lenisNow.scrollTo(y, { immediate: true, force: true })
        else window.scrollTo(0, y)
      }

      seeker.current = seek

      if (!REDUCED) {
        st = ScrollTrigger.create({
          trigger: pin,
          start: 'top top',
          end: '+=300%',
          pin: true,
          onUpdate: (self) => fromScroll(self.progress),
          onRefresh: (self) => fromScroll(self.progress),
        })
        fromScroll(st.progress)
        show(goal)
        gsap.ticker.add(follow)
      } else show(end)

      const fromX = (x: number) => {
        const r = track.getBoundingClientRect()

        return timeAt(pace, (x - r.left) / r.width)
      }

      const onDown = (e: PointerEvent) => {
        track.setPointerCapture(e.pointerId)
        track.focus({ preventScroll: true })
        seek(fromX(e.clientX))
      }

      const onMove = (e: PointerEvent) => {
        if (track.hasPointerCapture(e.pointerId)) seek(fromX(e.clientX))
      }

      const back = () => prevStop(stops, goal)
      const on = () => nextStop(stops, goal, end)

      const keys = new Map([
        ['ArrowLeft', back],
        ['ArrowDown', back],
        ['ArrowRight', on],
        ['ArrowUp', on],
        ['Home', () => 0],
        ['End', () => end],
      ])

      const onKey = (e: KeyboardEvent) => {
        const to = keys.get(e.key)

        if (!to) return

        e.preventDefault()
        seek(to())
      }

      track.addEventListener('pointerdown', onDown)
      track.addEventListener('pointermove', onMove)
      track.addEventListener('keydown', onKey)

      return () => {
        seeker.current = () => {}

        gsap.ticker.remove(follow)
        track.removeEventListener('pointerdown', onDown)
        track.removeEventListener('pointermove', onMove)
        track.removeEventListener('keydown', onKey)
      }
    },
    { scope: root, dependencies: [end, stops, pace] },
  )

  return { time, seek: seeker }
}
