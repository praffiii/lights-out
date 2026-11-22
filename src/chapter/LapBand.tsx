import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { circuitFor, type CircuitInfo } from '#/circuits/registry.ts'
import { INSETS, insetPoint } from '#/engine/inset.ts'
import { Inset, nextTurn } from '#/engine/Inset.tsx'
import { LapStrip, shortClock, stripValueText } from '#/engine/LapStrip.tsx'
import { batteryAt, firstFrame, gearWord, type PartId, phaseAt, readouts, STATES } from '#/engine/phase.ts'
import { Readouts } from '#/engine/Readouts.tsx'
import { PARTS } from '#/engine/rig.ts'
import { useLatestPole } from '#/engine/use-latest-pole.ts'
import { REDUCED, ScrollTrigger } from '#/motion/motion.ts'
import { clock, sampleAt, timeAt } from '#/pole/replay.ts'
import type { PoleLap } from '#/pole/schema.ts'
import { Go } from '#/shell/Go.tsx'
import { opposite, useTheme } from '#/shell/theme.ts'

import { linearPace } from './pace.ts'
import { useScrub } from './useScrub.ts'

const EMPTY_STOPS: ReadonlyArray<number> = []
const EMPTY_PACE = linearPace(1)

const sentenceFor = (phase: keyof typeof STATES, gear: number) => STATES[phase].sentence.replace('{gear}', gearWord(gear))

const makePainter = (lap: PoleLap | null, circuit: CircuitInfo | undefined, insetId: keyof typeof INSETS | null) => (scope: HTMLElement) => {
  if (!lap || !circuit || !insetId) return () => {}

  const inset = INSETS[insetId]
  const rows = new Map<PartId, { li: HTMLElement; state: HTMLElement | null; sentence: HTMLElement | null }>()

  for (const part of PARTS) {
    const li = scope.querySelector<HTMLElement>(`[data-part="${part.id}"]`)

    if (li) rows.set(part.id, { li, state: li.querySelector('[data-state]'), sentence: li.querySelector('[data-sentence]') })
  }

  const speedEl = scope.querySelector<HTMLElement>('[data-speed]')
  const peakEl = scope.querySelector<HTMLElement>('[data-peak]')
  const rpmEl = scope.querySelector<HTMLElement>('[data-rpm]')
  const gearEl = scope.querySelector<HTMLElement>('[data-gear]')
  const mgukEl = scope.querySelector<HTMLElement>('[data-mguk]')
  const mgukNoteEl = scope.querySelector<HTMLElement>('[data-mguk-note]')
  const batteryEl = scope.querySelector<HTMLElement>('[data-battery]')
  const batteryBarEl = scope.querySelector<HTMLElement>('[data-battery-bar]')
  const progressEl = scope.querySelector<HTMLElement>('[data-progress]')
  const headEl = scope.querySelector<HTMLElement>('[data-head]')
  const sliderEl = scope.querySelector<HTMLElement>('[role="slider"]')
  const insetLabelEl = scope.querySelector<HTMLElement>('[data-inset-label]')
  const insetDotEl = scope.querySelector<HTMLElement>('[data-inset-dot]')
  const scrollTimeEl = scope.querySelector<HTMLElement>('[data-scroll-time]')
  const lapClock = clock(lap.time)

  return (t: number) => {
    const clamped = Math.min(lap.time, Math.max(0, t))
    const sample = sampleAt(lap, clamped)
    const r = readouts(lap, clamped)
    const state = STATES[r.phase]
    const level = batteryAt(lap, clamped)
    const pct = `${((clamped / lap.time) * 100).toFixed(3)}%`
    const pos = insetPoint(inset.line, sample.u)
    const turn = nextTurn(circuit.laps, sample.u)

    if (speedEl) speedEl.textContent = r.speed

    if (peakEl) peakEl.textContent = r.peak

    if (rpmEl) rpmEl.textContent = r.rpm

    if (gearEl) gearEl.textContent = r.gear

    if (mgukEl) mgukEl.textContent = state.mguK.word

    if (mgukNoteEl) mgukNoteEl.textContent = state.mguK.note

    if (batteryEl) batteryEl.textContent = state.battery

    if (batteryBarEl) batteryBarEl.style.transform = `scaleX(${level.toFixed(3)})`

    if (progressEl) progressEl.style.width = pct

    if (headEl) headEl.style.left = pct

    if (sliderEl) {
      sliderEl.setAttribute('aria-valuenow', clamped.toFixed(2))
      sliderEl.setAttribute('aria-valuetext', stripValueText(lap, clamped))
    }

    if (insetLabelEl) insetLabelEl.textContent = `${circuit.name} · T${turn} ahead`

    if (insetDotEl) {
      insetDotEl.style.left = `${(pos.x * 100).toFixed(2)}%`
      insetDotEl.style.top = `${(pos.y * 100).toFixed(2)}%`
    }

    if (scrollTimeEl) scrollTimeEl.textContent = `Scroll ↓ · ${shortClock(clamped)} of ${lapClock}`

    for (const part of PARTS) {
      const entry = rows.get(part.id)

      if (!entry) continue

      const active = part.id === state.lit

      entry.li.toggleAttribute('data-active', active)
      entry.li.setAttribute('aria-expanded', String(active))

      if (entry.state) entry.state.textContent = state.states[part.id]

      if (entry.sentence && active) entry.sentence.textContent = sentenceFor(r.phase, sample.gear)
    }
  }
}

export function LapBand() {
  const { theme } = useTheme()
  const band = theme ? opposite(theme) : 'dark'
  const root = useRef<HTMLElement>(null)
  const [near, setNear] = useState(false)
  const latest = useLatestPole(near)

  useEffect(() => {
    if (REDUCED) {
      setNear(true)

      return
    }

    const el = root.current

    if (!el) return

    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '100% 0px' })

    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  const loaded = latest !== 'loading' && latest !== null ? latest : null
  const circuit = loaded ? circuitFor(loaded.circuit) : undefined
  const lap = loaded && circuit ? loaded.lap : null
  const inset = loaded && circuit ? INSETS[loaded.circuit] : null
  const first = useMemo(() => (lap ? firstFrame(lap) : null), [lap])
  const stops = useMemo(() => (lap && circuit ? circuit.laps.map((l) => timeAt(lap, l.u)) : EMPTY_STOPS), [lap, circuit])
  const pace = useMemo(() => (lap ? linearPace(lap.time) : EMPTY_PACE), [lap])
  const paint = useMemo(() => makePainter(lap, circuit, loaded ? loaded.circuit : null), [lap, circuit, loaded])
  const options = useMemo(() => (first ? { length: '+=500%', rest: first.t } : undefined), [first])

  useScrub(root, lap?.time ?? 0, stops, pace, paint, options)

  useLayoutEffect(() => {
    if (lap && !REDUCED) ScrollTrigger.refresh()
  }, [lap])

  const initialT = first?.t ?? 0
  const initialSample = lap ? sampleAt(lap, initialT) : null
  const initialPhase = lap ? phaseAt(lap, initialT) : 'push'
  const initialState = STATES[initialPhase]
  const headline = first?.headline ?? 'Flat out, and slowing.'
  const lines = headline.split(', ')

  const footnote =
    lap && circuit
      ? `Power unit modelled by Lights Out, simplified · Pole lap: ${lap.driver}, ${lap.team ?? ''}, ${lap.year} ${circuit.gp} · Telemetry: OpenF1 (unofficial) · MGU-K and battery state estimated from throttle and brake`
      : 'Power unit modelled by Lights Out, simplified · MGU-K and battery state estimated from throttle and brake'

  return (
    <>
      <section className="band flip lap-band" data-theme={theme ? band : undefined} data-live={lap && !REDUCED ? '' : undefined} aria-labelledby="lap-band" ref={root}>
        <div className="pin">
          <div className="head">
            <p className="mono label">{lap && circuit ? `Ride a pole lap · ${circuit.name}, ${lap.year}` : 'Ride a pole lap'}</p>
            <h2 id="lap-band" className="display headline">
              {lines.map((line, i) => (
                <span className="hl" key={line}>
                  {i === 0 && lines.length > 1 ? `${line},` : line}
                </span>
              ))}
            </h2>
            {lap ? (
              <p className="mono hint">
                <span className="full">{`Scroll to drive the lap · one lap, ${clock(lap.time)}`}</span>
                <span className="short">{`Scroll to drive the lap · ${clock(lap.time)}`}</span>
              </p>
            ) : null}
          </div>
          <div className="deck">
            <ol className="parts">
              {PARTS.map((part) => {
                const active = lap ? part.id === initialState.lit : false

                return (
                  <li key={part.id} data-part={part.id} data-active={active ? '' : undefined} aria-expanded={active}>
                    <div className="row">
                      <span className="mono n">{part.n}</span>
                      <span className="name">{part.name}</span>
                      <span className="mono state" data-state>
                        {initialState.states[part.id]}
                      </span>
                    </div>
                    <p className="sentence" data-sentence>
                      {active ? sentenceFor(initialPhase, initialSample?.gear ?? 8) : ''}
                    </p>
                  </li>
                )
              })}
            </ol>
            <div className="stage-col">
              <div className="stage">
                <img src={`/engine/band-${band}.webp`} alt="The assembled 2026 power unit with the active part highlighted." />
              </div>
              {lap && circuit && inset ? <Inset name={circuit.name} src={inset.src} line={inset.line} turns={circuit.laps} initialU={initialSample?.u ?? 0} /> : null}
            </div>
          </div>
          {lap && circuit ? (
            <div className="controls">
              <LapStrip lap={lap} turns={circuit.laps} initialT={initialT} />
              <Readouts lap={lap} initialT={initialT} />
              <div className="foot">
                <p className="mono muted scroll-time" data-scroll-time>{`Scroll ↓ · ${shortClock(initialT)} of ${clock(lap.time)}`}</p>
                <Go to={`/lap/${circuit.id}`} className="mono explore">{`Explore ${circuit.name} in 3D →`}</Go>
              </div>
            </div>
          ) : latest === null ? (
            <p className="mono muted no-lap">No pole lap to ride yet.</p>
          ) : (
            <div className="controls-reserve" aria-hidden />
          )}
        </div>
      </section>
      <p className="mono muted credit band-credit">{footnote}</p>
    </>
  )
}
