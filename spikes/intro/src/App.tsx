import gsap from 'gsap'
import { useCallback, useEffect, useRef, useState } from 'react'
import { drive, onFrame, release, startDrive } from './drive'
import { createEngine } from './engine'
import { Scene } from './Scene'

/** Each start light is one real loading step: 20% of the page, actually loaded. */
const TASKS = ['dom', 'archivo', 'mono', 'gl', 'frame'] as const
type Task = (typeof TASKS)[number]
type Phase = 'loading' | 'out' | 'gone'
const LOADER_MAX_MS = 2600
const LIGHT_GAP_MS = 170

/** A generic circuit, not a real one. The intro covers sector 1, the first third of it. */
const TRACK =
  'M120 380 L640 380 C720 380 760 340 760 290 L760 250 C760 210 790 190 830 190 C870 190 880 160 860 130 L820 80 C800 55 770 50 740 60 L420 150 C380 162 350 150 330 120 L300 80 C280 50 240 45 210 65 L110 140 C70 170 60 220 70 260 L80 330 C85 360 100 380 120 380 Z'

function formatTime(ms: number) {
  const s = ms / 1000
  return s < 60 ? s.toFixed(3) : `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, '0')}`
}

export default function App() {
  const [phase, setPhase] = useState<Phase>(drive.reduced ? 'gone' : 'loading')
  const [lit, setLit] = useState(0)
  const [sectorTime, setSectorTime] = useState<string | null>(null)
  const [sound, setSound] = useState(false)

  const engine = useRef<ReturnType<typeof createEngine> | null>(null)
  const done = useRef(new Set<Task>())
  const lastLit = useRef(0)
  const startedAt = useRef(performance.now())
  const lightsOutAt = useRef<number | null>(drive.reduced ? performance.now() : null)

  const loader = useRef<HTMLDivElement>(null)
  const timer = useRef<HTMLSpanElement>(null)
  const speed = useRef<HTMLSpanElement>(null)
  const gear = useRef<HTMLSpanElement>(null)
  const sector = useRef<HTMLSpanElement>(null)
  const mapPath = useRef<SVGPathElement>(null)
  const mapDone = useRef<SVGPathElement>(null)
  const mapDot = useRef<SVGCircleElement>(null)

  const mark = useCallback((task: Task) => {
    if (done.current.has(task)) return
    done.current.add(task)
    const now = performance.now()
    const at = Math.max(now, lastLit.current + LIGHT_GAP_MS)
    lastLit.current = at
    window.setTimeout(() => setLit((n) => Math.min(TASKS.length, n + 1)), at - now)
  }, [])
  const markGl = useCallback(() => mark('gl'), [mark])
  const markFrame = useCallback(() => mark('frame'), [mark])

  useEffect(() => {
    const stop = startDrive()
    mark('dom')
    document.fonts.load('900 1em Archivo').then(() => mark('archivo'))
    document.fonts.load('500 1em "Martian Mono"').then(() => mark('mono'))
    // Never hold the visitor longer than the budget, even if a step stalls.
    const fallback = window.setTimeout(() => TASKS.forEach(mark), LOADER_MAX_MS - 900)
    return () => {
      stop()
      window.clearTimeout(fallback)
    }
  }, [mark])

  // All five lights on, a random hold like a real start, then lights out.
  useEffect(() => {
    if (phase !== 'loading' || lit < TASKS.length) return
    const budget = LOADER_MAX_MS - (performance.now() - startedAt.current) - 400
    const hold = 250 + Math.random() * Math.max(0, Math.min(900, budget - 250))
    const out = window.setTimeout(() => {
      lightsOutAt.current = performance.now()
      setPhase('out')
    }, hold)
    return () => window.clearTimeout(out)
  }, [lit, phase])

  useEffect(() => {
    if (phase !== 'out') return
    const go = window.setTimeout(() => {
      release(innerHeight * 0.6)
      gsap.to(loader.current, {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 0.9,
        ease: 'launch',
        onComplete: () => setPhase('gone'),
      })
    }, 350)
    return () => window.clearTimeout(go)
  }, [phase])

  // Corner readouts, map, timer and engine all follow the same clock.
  useEffect(() => {
    const path = mapPath.current!
    const total = path.getTotalLength()
    mapDone.current!.style.strokeDasharray = String(total)
    let finished = false
    return onFrame(() => {
      const lap = drive.progress / 3
      speed.current!.textContent = String(Math.round(drive.kmh))
      gear.current!.textContent = drive.gear === 0 ? 'N' : String(drive.gear)
      sector.current!.textContent = `Sector 1 · ${Math.round(lap * 100)}%`
      mapDone.current!.style.strokeDashoffset = String(total * (1 - lap))
      const point = path.getPointAtLength(total * lap)
      mapDot.current!.setAttribute('cx', point.x.toFixed(1))
      mapDot.current!.setAttribute('cy', point.y.toFixed(1))
      engine.current?.update(drive.rpm, drive.speed)

      const since = lightsOutAt.current
      if (since === null) return
      if (timer.current) timer.current.textContent = formatTime(performance.now() - since)
      if (!finished && drive.progress > 0.985) {
        finished = true
        setSectorTime(formatTime(performance.now() - since))
      }
    })
  }, [])

  const toggleSound = async () => {
    engine.current ??= createEngine()
    setSound(await engine.current.toggle())
  }

  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <Scene onGl={markGl} onFirstFrame={markFrame} />

      <header className="hud hud-top">
        <a className="wordmark" href="/">
          Lights Out
        </a>
        <button className="chip" type="button">
          Menu
        </button>
      </header>

      <div className="hud hud-bl" aria-hidden>
        <svg className="map" viewBox="40 30 860 400">
          <path ref={mapPath} d={TRACK} className="map-track" />
          <path ref={mapDone} d={TRACK} className="map-done" />
          <circle ref={mapDot} r="30" className="map-dot" />
        </svg>
        <span ref={sector} className="meta">
          Sector 1 · 0%
        </span>
      </div>

      <div className="hud hud-br">
        <div className="readout" aria-hidden>
          <span ref={speed} className="speed">
            0
          </span>
          <span className="meta">km/h</span>
        </div>
        <div className="readout-row">
          <span className="meta" aria-hidden>
            Gear <span ref={gear}>N</span>
          </span>
          <button className="chip" type="button" aria-pressed={sound} onClick={toggleSound}>
            Sound {sound ? 'on' : 'off'}
          </button>
        </div>
      </div>

      <main id="content">
        <section className="beat hero">
          <div className="pin">
            <h1 className="display mega">Lights out</h1>
            <p className="lede">Your first lap of Formula 1. Scroll to drive.</p>
          </div>
        </section>

        <section className="beat">
          <div className="pin">
            <h2 className="display xl">Scroll is your throttle.</h2>
            <p className="body">Scroll faster and the car picks up speed. Stop, and it brakes. The speed and gear in the corner are yours.</p>
          </div>
        </section>

        <section className="beat right">
          <div className="pin">
            <h2 className="display xl">Twenty-two cars.</h2>
            <p className="body">Eleven teams, two drivers each, and one first corner that all of them want to reach first.</p>
          </div>
        </section>

        <section className={`beat finish${sectorTime ? ' is-done' : ''}`}>
          <div className="pin">
            <span className="sweep" aria-hidden />
            <p className="meta label">Sector 1</p>
            <p className="time" aria-live="polite">
              {sectorTime ?? '--.---'}
            </p>
            <p className="meta pb">{sectorTime ? 'Personal best' : 'Keep driving'}</p>
            <p className="body">
              Green on the timing screen means a personal best. <span className="purple">Purple</span> means the fastest of anyone. Your first sector is
              always a personal best.
            </p>
            <a className="next" href="#">
              Next: how F1 works
            </a>
            <p className="disclaimer">Lights Out is an unofficial fan project. Not affiliated with Formula 1, FOM or any team.</p>
          </div>
        </section>
      </main>

      {phase !== 'gone' && (
        <div className="loader" ref={loader} data-phase={phase} style={{ ['--lit' as string]: lit }}>
          <div className="lights" role="progressbar" aria-label="Loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={lit * 20}>
            {TASKS.map((task, i) => (
              <span key={task} className="housing">
                <span className="lamp" data-on={phase === 'loading' && i < lit} />
              </span>
            ))}
          </div>
          <p className="loader-meta">
            {phase === 'loading' ? (
              <>
                <span className="meta">Loading</span> <span>{lit * 20}</span>
              </>
            ) : (
              <span ref={timer}>0.000</span>
            )}
          </p>
        </div>
      )}
    </>
  )
}
