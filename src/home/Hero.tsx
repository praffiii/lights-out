import { type CSSProperties, lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { CircuitGuard } from '#/circuits/CircuitGuard.tsx'
import { chipBelow, fitCrop } from '#/circuits/fit.ts'
import { type CircuitInfo, circuitFor } from '#/circuits/registry.ts'
import { useMedia, useMounted } from '#/motion/client.ts'
import { gsap, onEnter, REDUCED, ScrollTrigger, sweep, useGSAP } from '#/motion/motion.ts'
import { Go } from '#/shell/Go.tsx'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { useSeason } from '#/season/use-season.ts'
import { type PickedRace, pickRace, RACE_WHEN } from '#/season/weekend.ts'

import { type Car, CARS } from './cars.ts'
import { HERO } from './content.ts'
import { Tracker } from './Tracker.tsx'

const Circuit = lazy(() => import('#/circuits/Circuit.tsx'))

const LAP_S = 14

const FILL_S = 1.6

const NARROW = '(max-width: 1199px)'

type Vars = CSSProperties & Record<`--${string}`, number | string>

let drawn = () => {}

const firstFrame = new Promise<void>((resolve) => {
  drawn = resolve
})

const circuitOf = (snapshot: SeasonSnapshot) => {
  const picked = pickRace(snapshot, new Date())
  const info = picked ? circuitFor(picked.race.circuit.circuitId) : undefined

  return picked && info ? { picked, info } : null
}

export const heroShown = (snapshot: SeasonSnapshot) => (circuitOf(snapshot) && !REDUCED ? firstFrame : undefined)

const watchHidden = (fn: () => void) => {
  document.addEventListener('visibilitychange', fn)

  return () => document.removeEventListener('visibilitychange', fn)
}

const useHidden = () =>
  useSyncExternalStore(
    watchHidden,
    () => document.hidden,
    () => false,
  )

export function Hero() {
  const season = useSeason()
  const circuit = season.data ? circuitOf(season.data) : null
  const root = useRef<HTMLElement>(null)
  const lap = useRef<HTMLElement>(null)
  const fill = useRef(REDUCED ? 1 : 0)
  const running = useRef(false)
  const [at, setAt] = useState(0)
  const [paused, setPaused] = useState(false)
  const [started, setStarted] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const [glReady, setGlReady] = useState(false)
  const [glFailed, setGlFailed] = useState(false)
  const hidden = useHidden()
  const live = started && !paused && onScreen && !hidden && !REDUCED
  const timed = !circuit || glFailed

  useEffect(() => {
    running.current = live && glReady && !glFailed
  }, [live, glReady, glFailed])

  useEffect(() => {
    if (REDUCED) drawn()
  }, [])

  const hasCircuit = circuit !== null

  useEffect(() => {
    if (hasCircuit) ScrollTrigger.refresh()
  }, [hasCircuit])

  const advance = useCallback(() => setAt((i) => (i + 1) % CARS.length), [])

  const fallback = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    const bar = lap.current

    if (!timed || !bar || REDUCED) return

    const tween = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: LAP_S, ease: 'none', paused: true, onComplete: advance })

    fallback.current = tween

    return () => {
      tween.kill()
      fallback.current = null
    }
  }, [timed, at, advance])

  useEffect(() => {
    fallback.current?.paused(!live)
  }, [live, timed, at])

  const onLapProgress = useCallback((t: number) => {
    if (lap.current) gsap.set(lap.current, { scaleX: t })
  }, [])

  const onReady = useCallback(() => {
    setGlReady(true)
    drawn()
  }, [])

  const onFail = useCallback(() => {
    setGlFailed(true)
    drawn()
  }, [])

  useGSAP(
    (_, safe) => {
      const el = root.current

      if (!el || !safe) return

      const off = onEnter(
        safe(() => {
          el.querySelectorAll<HTMLElement>('h1 .hl').forEach((line, i) => sweep(line, { scroll: false, delay: i * 0.1 }))

          for (const line of el.querySelectorAll<HTMLElement>('.hero-copy .intro, .hero-copy .meta')) sweep(line, { scroll: false, delay: 0.3 })

          if (REDUCED) return

          gsap.from(el.querySelectorAll('.hero-copy .cta'), { autoAlpha: 0, y: 12, duration: 0.6, delay: 0.85 })
          gsap.to(fill, { current: 1, duration: FILL_S, ease: 'power2.inOut', delay: 0.4, onComplete: () => setStarted(true) })
        }),
      )

      ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: (s) => setOnScreen(s.isActive) })

      return off
    },
    { scope: root },
  )

  const car = CARS[at] ?? CARS[0]

  return (
    <section className="hero" data-theme="dark" ref={root} aria-labelledby="h1">
      <div className="hero-frame">
        {circuit && <Stage {...circuit} car={car} at={at} fill={fill} running={running} glReady={glReady} glFailed={glFailed} onLap={advance} onLapProgress={onLapProgress} onReady={onReady} onFail={onFail} />}
        <div className="hero-copy">
          <p className="meta mono muted">{HERO.meta}</p>
          <h1 id="h1">
            {HERO.lines.map((line) => (
              <span key={line} className="hl">
                {line}
              </span>
            ))}
          </h1>
          <p className="intro">{HERO.intro}</p>
          <Go to="/chapters/race-weekend" className="cta">Start the guide</Go>
        </div>
        <Tracker at={at} onPick={setAt} lap={lap} paused={paused} onPause={() => setPaused((p) => !p)} />
        {circuit && <Facts {...circuit} />}
      </div>
    </section>
  )
}

type StageProps = {
  picked: PickedRace
  info: CircuitInfo
  car: Car | undefined
  at: number
  fill: { current: number }
  running: { current: boolean }
  glReady: boolean
  glFailed: boolean
  onLap: () => void
  onLapProgress: (t: number) => void
  onReady: () => void
  onFail: () => void
}

function Stage({ info, car, at, fill, running, glReady, glFailed, onLap, onLapProgress, onReady, onFail }: StageProps) {
  const mounted = useMounted()
  const narrow = useMedia(NARROW)
  const pins = useRef<HTMLDivElement>(null)
  const tag = useRef<HTMLSpanElement>(null)
  const [x0, y0, x1, y1] = info.crop
  const fit = fitCrop(info.crop)
  const crop: Vars = { '--x0': x0, '--y0': y0, '--x1': x1, '--y1': y1, '--fk': fit.k, '--fx': fit.x, '--fy': fit.y }
  const poster = `/circuits/${info.model}`

  return (
    <div className="stage" style={crop} data-gl={glReady ? '' : undefined} data-waiting={!REDUCED && !glReady && !glFailed ? '' : undefined}>
      <div className="poster-box">
        <img
          className="poster"
          src={`${poster}.webp`}
          srcSet={`${poster}-1440.webp 1440w, ${poster}.webp 2880w`}
          sizes={`${NARROW} 200vw, 100vw`}
          alt={`${info.name} in 3D. Sector one purple, sector two green, sector three yellow, with ${info.facts.turns} numbered turns.`}
          hidden={glReady}
        />
      </div>
      {mounted && !REDUCED && (
        <div className="gl">
          <CircuitGuard onError={onFail}>
            <Suspense fallback={null}>
              <Circuit
                model={info.model}
                layout={narrow ? 'narrow' : 'wide'}
                fill={fill}
                pins={pins}
                onReady={onReady}
                lap={{ restart: at, running, tag, onLap, onLapProgress }}
              />
            </Suspense>
          </CircuitGuard>
        </div>
      )}
      {car && (
        <span className="tag mono" ref={tag} hidden={!glReady || REDUCED} style={{ borderColor: car.colour }} aria-hidden>
          {car.code}
        </span>
      )}
      <div className="pins" ref={pins} aria-hidden>
        {info.pins.map((pin) => {
          const place: Vars = { '--px': pin.x, '--py': pin.y }

          return (
            <span key={pin.turn} data-pin={`turn-${pin.turn}`} data-below={chipBelow(pin.x, pin.y, fit) ? '' : undefined} style={place}>
              <b>{String(pin.turn).padStart(2, '0')}</b>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function Facts({ picked, info }: { picked: PickedRace; info: CircuitInfo }) {
  const { facts } = info

  return (
    <div className="hero-foot">
      <dl className="facts">
        <div>
          <dt className="mono muted">First GP</dt>
          <dd>{facts.firstGp}</dd>
        </div>
        <div>
          <dt className="mono muted">Lap</dt>
          <dd>{facts.lengthKm} km</dd>
        </div>
        <div>
          <dt className="mono muted">Laps</dt>
          <dd>{facts.laps}</dd>
        </div>
        <div>
          <dt className="mono muted">Race distance</dt>
          <dd>{facts.distanceKm} km</dd>
        </div>
        <div>
          <dt className="mono muted">Turns</dt>
          <dd>
            {facts.turns}, {facts.direction}
          </dd>
        </div>
      </dl>
      <div className="note mono">
        <p>{`${info.name} · ${info.gp} · ${RACE_WHEN[picked.kind]} · round ${picked.round} of ${picked.of}`}</p>
        <p className="muted">Built in Blender from bacinger/f1-circuits (MIT) and NASA SRTM elevation · Map © OpenStreetMap contributors (ODbL)</p>
      </div>
      <p className="key mono muted">
        <span>
          <i style={{ background: 'var(--s1)' }} />
          Sector 1
        </span>
        <span>
          <i style={{ background: 'var(--s2)' }} />
          Sector 2
        </span>
        <span>
          <i style={{ background: 'var(--s3)' }} />
          Sector 3
        </span>
      </p>
    </div>
  )
}
