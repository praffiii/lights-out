import { useLenis } from 'lenis/react'
import { type RefObject, useLayoutEffect, useRef } from 'react'

import { gsap, REDUCED, ScrollTrigger, useGSAP } from '#/motion/motion.ts'

import { nextStop, type Pace, prevStop, progressAt, timeAt } from './pace.ts'

const FOLLOW = 0.1

const SETTLE = 0.002

const SNAP_PX = 2

const STEP = 1e-6

type Paint = (scope: HTMLElement) => (t: number) => void

export type Scrub = { time: RefObject<number>; seek: RefObject<(t: number) => void> }

export type ScrubOptions = { length?: string; rest?: number; scale?: Pace; stepped?: true }

export const scrubOptions = (end: number, pace: Pace, options?: ScrubOptions) => ({
  length: options?.length ?? '+=300%',
  rest: options?.rest ?? end,
  initial: options?.rest ?? 0,
  scale: options?.scale ?? pace,
})

export function useScrub(root: RefObject<HTMLElement | null>, end: number, stops: ReadonlyArray<number>, pace: Pace, paint: Paint, options?: ScrubOptions): Scrub {
  const inputs = { end, stops, pace, ...scrubOptions(end, pace, options) }
  const { length, rest, initial } = inputs
  const stepped = options?.stepped === true
  const ready = end > 0
  const hasRest = options?.rest !== undefined
  const time = useRef(REDUCED ? rest : initial)
  const seeker = useRef<(t: number) => void>(() => {})
  const lenis = useLenis()
  const scroller = useRef(lenis)
  const painter = useRef(paint)
  const latest = useRef(inputs)
  const refresher = useRef<(before: number) => void>(() => {})

  useLayoutEffect(() => {
    scroller.current = lenis
    painter.current = paint
  })

  useLayoutEffect(() => {
    const before = latest.current.end

    latest.current = inputs
    refresher.current(before)
  }, [end, stops, pace, rest, inputs.scale])

  useGSAP(
    () => {
      if (!ready) return

      const scope = root.current
      const pin = scope?.querySelector<HTMLElement>('.pin')
      const track = scope?.querySelector<HTMLElement>('[role="slider"]')

      if (!scope || !pin || !track) return

      const draw = painter.current(scope)
      let goal = REDUCED ? rest : initial
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
        if (hasRest && progress === 0 && target === null) {
          goal = latest.current.rest

          return
        }

        const t = timeAt(latest.current.pace, progress)
        const span = st ? st.end - st.start : 0
        const snap = span > 0 ? (SNAP_PX * latest.current.end) / span : 0

        if (target !== null && Math.abs(t - target) <= snap) {
          goal = target

          return
        }

        target = null
        goal = t
      }

      const seek = (t: number) => {
        goal = Math.min(latest.current.end, Math.max(0, t))

        if (!st) return show(goal)

        target = goal

        const y = st.start + progressAt(latest.current.pace, goal) * (st.end - st.start)
        const lenisNow = scroller.current

        if (lenisNow) lenisNow.scrollTo(y, { immediate: true, force: true })
        else window.scrollTo(0, y)
      }

      seeker.current = seek

      refresher.current = (before) => {
        if (st) fromScroll(st.progress)
        else goal = goal === before ? latest.current.rest : Math.min(goal, latest.current.end)

        show(goal)
      }

      const trackScroll = (progress: number) => {
        fromScroll(progress)

        if (stepped) show(goal)
      }

      if (!REDUCED) {
        st = ScrollTrigger.create({
          trigger: pin,
          start: 'top top',
          end: length,
          pin: true,
          onUpdate: (self) => trackScroll(self.progress),
          onRefresh: (self) => trackScroll(self.progress),
        })
        fromScroll(st.progress)
        show(goal)

        if (!stepped) gsap.ticker.add(follow)
      } else show(rest)

      const fromX = (x: number) => {
        const r = track.getBoundingClientRect()

        return timeAt(latest.current.scale, (x - r.left) / r.width)
      }

      const onDown = (e: PointerEvent) => {
        track.setPointerCapture(e.pointerId)
        track.focus({ preventScroll: true })
        seek(fromX(e.clientX))
      }

      const onMove = (e: PointerEvent) => {
        if (track.hasPointerCapture(e.pointerId)) seek(fromX(e.clientX))
      }

      const here = () => (stepped ? Math.floor(goal + STEP) : goal)
      const back = () => prevStop(latest.current.stops, here())
      const on = () => nextStop(latest.current.stops, here(), latest.current.end)

      const keys = new Map([
        ['ArrowLeft', back],
        ['ArrowDown', back],
        ['ArrowRight', on],
        ['ArrowUp', on],
        ['Home', () => 0],
        ['End', () => latest.current.end],
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

        refresher.current = () => {}

        gsap.ticker.remove(follow)
        track.removeEventListener('pointerdown', onDown)
        track.removeEventListener('pointermove', onMove)
        track.removeEventListener('keydown', onKey)
      }
    },
    { scope: root, dependencies: [ready, length, stepped] },
  )

  return { time, seek: seeker }
}
