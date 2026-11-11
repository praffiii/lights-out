import { type CSSProperties, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'

import { grandPrix } from '#/circuits/calendar.ts'
import type { Replay } from '#/circuits/Circuit.tsx'
import { CircuitGuard } from '#/circuits/CircuitGuard.tsx'
import { fitSpin } from '#/circuits/fit.ts'
import type { CircuitInfo } from '#/circuits/registry.ts'
import { useMedia } from '#/motion/client.ts'
import { gsap, REDUCED } from '#/motion/motion.ts'
import type { PoleLap } from '#/pole/schema.ts'
import { usePoleLap } from '#/pole/use-pole-lap.ts'
import { useShell } from '#/shell/context.ts'
import { Go } from '#/shell/Go.tsx'

import { PoleHud } from './PoleHud.tsx'

const Circuit = lazy(() => import('#/circuits/Circuit.tsx'))

const WIDE = 16 / 9

const TALL = 4 / 5

const PHONE = '(max-width: 760px)'

const CREDIT = 'Blender model · layout bacinger/f1-circuits (MIT) · elevation SRTM (NASA) · Map © OpenStreetMap contributors (ODbL)'

const TELEMETRY = ' · Telemetry: OpenF1 (unofficial)'

type Vars = CSSProperties & Record<`--${string}`, number | string>

export const stageCredit = (lap: PoleLap | null) => (lap ? CREDIT + TELEMETRY : CREDIT)

export function useNearLap(id: string) {
  const [near, setNear] = useState(false)
  const onNear = useCallback(() => setNear(true), [])
  const lap = usePoleLap(id, near)

  return { near, onNear, lap }
}

export function CircuitStage({ info, near, lap, onNear }: { info: CircuitInfo; near: boolean; lap: PoleLap | null; onNear: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const pins = useRef<HTMLDivElement>(null)
  const fill = useRef(1)
  const replay = useRef<Replay>({ running: { current: false }, trace: { current: null }, turns: { current: [] } }).current
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [turns, setTurns] = useState(true)
  const [sectors, setSectors] = useState(true)
  const phone = useMedia(PHONE)
  const { go } = useShell()
  const fit = fitSpin(info.crop, phone ? TALL : WIDE)
  const vars: Vars = { '--w': fit.w, '--h': fit.h, '--x': fit.x, '--y': fit.y }
  const poster = `/circuits/${info.model}`

  useEffect(() => {
    const el = box.current

    if (!el) return

    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && onNear(), { rootMargin: '200px' })

    observer.observe(el)

    return () => observer.disconnect()
  }, [onNear])

  useEffect(() => () => void gsap.killTweensOf(fill), [])

  const dive = () => {
    const el = box.current
    const img = el?.querySelector('img.poster')
    const rect = el?.getBoundingClientRect()

    return rect ? { rect, image: { left: rect.left - fit.x * rect.width, top: rect.top - fit.y * rect.height, width: fit.w * rect.width, height: fit.h * rect.height }, poster: img instanceof HTMLImageElement && img.currentSrc ? img.currentSrc : `${poster}.webp` } : undefined
  }

  const pick = (u: number) => void go(`/lap/${info.id}?at=${u.toFixed(4)}`, dive())

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
        data-turns={turns ? 'on' : 'off'}
        data-sectors={sectors ? 'on' : 'off'}
        data-gl={ready ? '' : undefined}
        data-failed={failed ? '' : undefined}
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
                <Circuit model={info.model} layout="spin" fill={fill} pins={pins} replay={lap ? replay : undefined} onReady={() => setReady(true)} />
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
                <em className="mono" data-apex />
              </span>
            )
          })}
        </div>
        {lap ? <PoleHud lap={lap} gp={grandPrix(info.gp)} stage={box} pins={pins} replay={replay} onPick={pick} /> : null}
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
      <Go
        to={`/lap/${info.id}`}
        className="mono explore"
        dive={dive}
      >
        Explore the lap in 3D
      </Go>
    </>
  )
}
