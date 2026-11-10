import { type CSSProperties, lazy, type PointerEvent, Suspense, useEffect, useRef, useState } from 'react'

import { CircuitGuard } from '#/circuits/CircuitGuard.tsx'
import { fitSpin } from '#/circuits/fit.ts'
import type { CircuitInfo } from '#/circuits/registry.ts'
import { useMedia } from '#/motion/client.ts'
import { gsap, REDUCED } from '#/motion/motion.ts'
import { Go } from '#/shell/Go.tsx'

import type { Band } from './page-model.ts'

const Circuit = lazy(() => import('#/circuits/Circuit.tsx'))

const WIDE = 16 / 9

const TALL = 4 / 5

const PHONE = '(max-width: 760px)'

const LIMIT = Math.PI / 4

const GAIN = 0.006

const OVER = 0.3

const CREDIT = 'Blender model · layout bacinger/f1-circuits (MIT) · elevation SRTM (NASA) · Map © OpenStreetMap contributors (ODbL)'

type Vars = CSSProperties & Record<`--${string}`, number | string>

type Drag = { x: number; t: number; v: number }

const degrees = (radians: number) => Math.round((radians * 180) / Math.PI) || 0

function Stat({ label, value, unit, num }: { label: string; value: string | number; unit?: string; num?: 'num' | 'num year' }) {
  return (
    <div>
      <dt className="mono">{label}</dt>
      <dd>
        <span className={num}>{value}</span>
        {unit ? <span className="mono unit">{unit}</span> : null}
      </dd>
    </div>
  )
}

function Stage({ info }: { info: CircuitInfo }) {
  const box = useRef<HTMLDivElement>(null)
  const pins = useRef<HTMLDivElement>(null)
  const yaw = useRef(0)
  const fill = useRef(1)
  const drag = useRef<Drag | null>(null)
  const coast = useRef<((time: number, dt: number) => void) | null>(null)
  const [near, setNear] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [turns, setTurns] = useState(true)
  const [sectors, setSectors] = useState(true)
  const [deg, setDeg] = useState(0)
  const phone = useMedia(PHONE)
  const fit = fitSpin(info.crop, phone ? TALL : WIDE)
  const vars: Vars = { '--w': fit.w, '--h': fit.h, '--x': fit.x, '--y': fit.y }
  const poster = `/circuits/${info.model}`

  useEffect(() => {
    const el = box.current

    if (!el) return

    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && setNear(true), { rootMargin: '200px' })

    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  useEffect(
    () => () => {
      gsap.killTweensOf(yaw)
      gsap.killTweensOf(fill)

      if (coast.current) gsap.ticker.remove(coast.current)
    },
    [],
  )

  const settle = () => setDeg(degrees(yaw.current))

  const halt = () => {
    gsap.killTweensOf(yaw)

    if (coast.current) gsap.ticker.remove(coast.current)

    coast.current = null
  }

  const springBack = () => {
    const edge = Math.sign(yaw.current) * LIMIT

    if (REDUCED) {
      yaw.current = edge
      settle()

      return
    }

    gsap.to(yaw, { current: edge, duration: 0.5, ease: 'power3.out', onComplete: settle })
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    halt()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, t: e.timeStamp, v: 0 }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const last = drag.current

    if (!last) return

    const dx = e.clientX - last.x
    const outward = Math.abs(yaw.current) >= LIMIT && Math.sign(dx) === Math.sign(yaw.current)
    const step = dx * GAIN * (outward ? OVER : 1)

    yaw.current += step
    drag.current = { x: e.clientX, t: e.timeStamp, v: step / Math.max(1, e.timeStamp - last.t) }
  }

  const onPointerUp = () => {
    const last = drag.current

    drag.current = null

    if (!last) return

    if (Math.abs(yaw.current) > LIMIT) return springBack()

    if (REDUCED || Math.abs(last.v) < 1e-5) return settle()

    let v = last.v

    const tick = (_time: number, dt: number) => {
      yaw.current += v * dt
      v *= 0.92 ** (dt / 16.7)

      const edge = Math.abs(yaw.current) >= LIMIT

      if (edge) yaw.current = Math.sign(yaw.current) * LIMIT

      if (edge || Math.abs(v) < 1e-5) {
        halt()
        settle()
      }
    }

    coast.current = tick
    gsap.ticker.add(tick)
  }

  const reset = () => {
    halt()

    if (REDUCED) {
      yaw.current = 0
      settle()

      return
    }

    gsap.to(yaw, { current: 0, duration: 0.8, ease: 'launch', onComplete: settle })
  }

  const toggleSectors = () => {
    const on = !sectors

    setSectors(on)

    if (REDUCED) fill.current = on ? 1 : 0
    else gsap.to(fill, { current: on ? 1 : 0, duration: 0.6, ease: 'power2.inOut', overwrite: true })
  }

  return (
    <>
      <div
        className="stage"
        ref={box}
        style={vars}
        data-yaw={deg}
        data-turns={turns ? 'on' : 'off'}
        data-sectors={sectors ? 'on' : 'off'}
        data-gl={ready ? '' : undefined}
        data-failed={failed ? '' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          className="poster"
          src={`${poster}.webp`}
          srcSet={`${poster}-1440.webp 1440w, ${poster}.webp 2880w`}
          sizes="200vw"
          alt={`${info.name} in 3D. Sector one purple, sector two green, sector three yellow, with ${info.facts.turns} numbered turns.`}
          hidden={ready}
          draggable={false}
        />
        {near && !failed ? (
          <div className="gl">
            <CircuitGuard onError={() => setFailed(true)}>
              <Suspense fallback={null}>
                <Circuit model={info.model} layout="spin" fill={fill} pins={pins} yaw={yaw} onReady={() => setReady(true)} />
              </Suspense>
            </CircuitGuard>
          </div>
        ) : null}
        <div className="pins" ref={pins} aria-hidden>
          {info.pins.map((pin) => {
            const place: Vars = { '--px': pin.x, '--py': pin.y }

            return (
              <span key={pin.turn} className="turn" data-pin={`turn-${pin.turn}`} style={place}>
                <b className="mono">{String(pin.turn).padStart(2, '0')}</b>
                {info.corner?.turn === pin.turn ? <i className="mono">{info.corner.name}</i> : null}
              </span>
            )
          })}
        </div>
        {deg !== 0 ? (
          <button type="button" className="mono reset" onPointerDown={(e) => e.stopPropagation()} onClick={reset}>
            Reset
          </button>
        ) : null}
      </div>
      <div className="mono toggles">
        <button type="button" aria-pressed={turns} onClick={() => setTurns((on) => !on)}>
          <i aria-hidden />
          Turns
        </button>
        <button type="button" aria-pressed={sectors} disabled={!ready || failed} onClick={toggleSectors}>
          <i aria-hidden />
          Sectors
        </button>
      </div>
      <Go to={`/lap/${info.id}`} className="mono explore">
        Explore the lap in 3D
      </Go>
    </>
  )
}

export function CircuitBand({ band }: { band: Band }) {
  const { info, facts } = band

  return (
    <section className="band" data-theme="dark" aria-label="The circuit">
      <div className="card">
        <dl className="figures">
          <Stat label="When" value={band.when} />
          {facts ? <Stat label="Length" value={facts.lengthKm} unit="km" num="num" /> : null}
          {info ? <Stat label="Distance" value={info.facts.distanceKm} unit="km" num="num" /> : null}
          {facts ? <Stat label="Laps" value={facts.laps} num="num" /> : null}
          {facts ? <Stat label="First Grand Prix" value={facts.firstGp} num="num year" /> : null}
        </dl>
        <div className="schedule">
          <p className="mono">{`Schedule · your time · ${band.zone}`}</p>
          <ul>
            {band.schedule.map((row) => (
              <li key={row.label} className={`is-${row.state}`}>
                <span className="name">{row.label}</span>
                <span className="mono day">{row.day}</span>
                <span className="mono time">{row.time}</span>
              </li>
            ))}
          </ul>
        </div>
        {info ? <Stage info={info} /> : null}
      </div>
      {info ? <p className="mono credit">{CREDIT}</p> : null}
    </section>
  )
}
