import { type CSSProperties, type RefObject, useEffect, useLayoutEffect, useRef } from 'react'

import type { Replay } from '#/circuits/Circuit.tsx'
import { gsap, REDUCED } from '#/motion/motion.ts'
import { advance, apexes, clock, nearest, nearestTurn, pointAt, sampleAt, splits, timeAt } from '#/pole/replay.ts'
import type { PoleLap } from '#/pole/schema.ts'

const SNAP_PX = 56
const TAP_PX = 32
const HIT = 0.012
const LEAD = 0.01
const TRAIL = 9
const TRAIL_STEP = 0.004
const GAP = 14

type Props = {
  lap: PoleLap
  gp: string
  stage: RefObject<HTMLDivElement | null>
  pins: RefObject<HTMLDivElement | null>
  replay: Replay
  onPick: (u: number) => void
}

const near = (a: number, b: number) => Math.abs(a - b - Math.round(a - b)) < HIT

const write = (el: Element | null | undefined, text: string) => {
  if (el && el.textContent !== text) el.textContent = text
}

export function PoleHud({ lap, gp, stage, pins, replay, onPick }: Props) {
  const hud = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const car = useRef<HTMLDivElement>(null)
  const picked = useRef(onPick)
  const still = REDUCED ? lap.time : 0

  useLayoutEffect(() => {
    picked.current = onPick
  }, [onPick])

  useEffect(() => {
    const el = stage.current
    const root = hud.current

    if (!el || !root) return

    const clockEl = root.querySelector('.lapclock')
    const splitEls = [...root.querySelectorAll<HTMLElement>('.splits li')]
    const dots = [...(car.current?.children ?? [])].filter((dot) => dot instanceof HTMLElement)
    const readout = card.current
    const speed = readout?.querySelector('[data-speed]')
    const gear = readout?.querySelector('[data-gear]')
    const throttle = readout?.querySelector<HTMLElement>('[data-throttle]')
    const brake = readout?.querySelector<HTMLElement>('[data-brake]')
    let state = { t: 0, hold: 0 }
    let scrub: number | null = null
    let lit = -1
    let seen = false
    let ticking = false
    let pinEls: HTMLElement[] = []

    const light = (u: number) => {
      const turns = replay.turns.current

      if (turns.length === 0) return

      if (pinEls.length === 0) {
        const apex = apexes(lap, turns)

        pinEls = [...(pins.current?.querySelectorAll<HTMLElement>('[data-pin]') ?? [])]

        for (const pin of pinEls) {
          const a = apex.get(Number(pin.dataset.pin?.slice('turn-'.length)))

          write(pin.querySelector('[data-apex]'), a ? `${a.speed} km/h · G${a.gear}` : '')
        }
      }

      const hit = turns.find((turn) => near(u, turn.u))?.turn ?? -1

      if (hit === lit) return

      lit = hit

      for (const pin of pinEls) pin.toggleAttribute('data-hit', pin.dataset.pin === `turn-${hit}`)
    }

    const draw = () => {
      const width = el.clientWidth
      const height = el.clientHeight
      const cardW = readout?.offsetWidth ?? 0
      const cardH = readout?.offsetHeight ?? 0
      const now = sampleAt(lap, state.t)
      const u = scrub ?? now.u
      const trace = replay.trace.current

      replay.at.current = u
      write(clockEl, clock(state.t))

      for (const [i, split] of splits(lap, state.t).entries()) {
        const li = splitEls[i]

        if (!li) continue

        li.dataset.state = split.state
        write(li.querySelector('b'), split.text)
      }

      write(speed, String(Math.round(now.speed)))
      write(gear, String(now.gear))

      if (throttle) throttle.style.scale = `${now.throttle / 100} 1`

      if (brake) brake.style.scale = `${now.brake > 0 ? 1 : 0} 1`

      light(u)

      if (!trace || !car.current || !readout) return

      for (const [i, dot] of dots.entries()) {
        const p = pointAt(trace, u - TRAIL_STEP * i)

        dot.style.translate = `${p.x}px ${p.y}px`
      }

      const head = pointAt(trace, u)

      readout.style.transform = `translate(${Math.max(0, Math.min(head.x + GAP, width - cardW))}px, ${Math.max(0, Math.min(head.y + GAP, height - cardH))}px)`
      car.current.style.visibility = 'visible'
      readout.style.visibility = 'visible'
    }

    const tick = (_time: number, dtMs: number) => {
      if (scrub === null) state = advance(state, dtMs / 1000, lap.time)

      draw()
    }

    const sync = () => {
      const run = seen && !document.hidden

      replay.running.current = run

      if (REDUCED || run === ticking) return

      ticking = run

      if (run) gsap.ticker.add(tick)
      else gsap.ticker.remove(tick)
    }

    const local = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()

      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onMove = (e: PointerEvent) => {
      const trace = replay.trace.current

      if (e.pointerType === 'touch' || !trace) return

      const { x, y } = local(e)

      scrub = nearest(trace, x, y, SNAP_PX)
      el.toggleAttribute('data-scrub', scrub !== null)

      if (scrub !== null) state = { t: timeAt(lap, scrub), hold: 0 }
    }

    const onLeave = () => {
      scrub = null
      el.removeAttribute('data-scrub')
    }

    const onClick = (e: MouseEvent) => {
      const trace = replay.trace.current

      if (!(e instanceof PointerEvent && e.pointerType === 'touch')) {
        if (scrub !== null) picked.current(scrub)

        return
      }

      if (!trace) return

      const { x, y } = local(e)
      const u = nearestTurn(trace, replay.turns.current, x, y, TAP_PX)

      if (u !== null) state = { t: timeAt(lap, u - LEAD), hold: 0 }
    }

    const observer = new IntersectionObserver((entries) => {
      seen = entries.at(-1)?.isIntersecting ?? seen
      sync()
    })

    observer.observe(el)
    document.addEventListener('visibilitychange', sync)

    if (!REDUCED) {
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerleave', onLeave)
      el.addEventListener('click', onClick)
    }

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('click', onClick)
      el.removeAttribute('data-scrub')
      gsap.ticker.remove(tick)
      replay.running.current = false
    }
  }, [lap, stage, pins, replay])

  return (
    <>
      <div className="replay" ref={hud} aria-hidden>
        <p className="mono who">
          <span>Pole lap</span>
          {` · ${lap.driver} · ${lap.year} ${gp}${lap.wet ? ' · Wet' : ''}`}
        </p>
        <div className="row">
          <p className="lapclock">{clock(still)}</p>
          <ol className="mono splits">
            {splits(lap, still).map((split, i) => (
              <li key={i} data-s={i + 1} data-state={split.state}>
                <span>{`S${i + 1}`}</span>
                <b>{split.text}</b>
              </li>
            ))}
          </ol>
        </div>
        {REDUCED ? null : (
          <p className="mono hint">
            <span className="fine">Hover the track to scrub · click to ride from there</span>
            <span className="coarse">Tap a turn to jump to it</span>
          </p>
        )}
      </div>
      {REDUCED ? null : (
        <>
          <div className="car" ref={car} aria-hidden>
            {Array.from({ length: TRAIL }, (_, i) => {
              const fade: CSSProperties & Record<'--k', number> = { '--k': i }

              return <i key={i} className={i === 0 ? 'head' : undefined} style={fade} />
            })}
          </div>
          <div className="readout" ref={card} aria-hidden>
            <b data-speed>0</b>
            <span className="mono">km/h</span>
            <span className="mono gear">
              G<span data-gear>0</span>
            </span>
            <span className="pedals">
              <i data-throttle />
              <i data-brake />
            </span>
          </div>
        </>
      )}
    </>
  )
}
