import { Component, lazy, type ReactNode, Suspense, useCallback, useRef, useState } from 'react'

import { type CircuitInfo, circuitFor } from '#/circuits/registry.ts'
import { useMounted } from '#/motion/client.ts'
import { gsap, REDUCED, roll, ScrollTrigger, sweep, useGSAP } from '#/motion/motion.ts'
import { Soon } from '#/shell/Go.tsx'
import { useTheme } from '#/shell/theme.ts'
import { useSeason } from '#/season/use-season.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { type PickedRace, pickRace, type RaceKind } from '#/season/weekend.ts'

const Circuit = lazy(() => import('#/circuits/Circuit.tsx'))

const noop = () => {}

const pct = (v: number) => `${v * 100}%`

const LABEL: Record<RaceKind, string> = { 'this-weekend': 'This weekend', next: 'Next race', finale: 'Season finale' }

const WHEN: Record<RaceKind, string> = { 'this-weekend': 'this weekend.', next: 'next.', finale: 'the finale.' }

let drawn = () => {}

const firstFrame = new Promise<void>((resolve) => {
  drawn = resolve
})

const bandFor = (snapshot: SeasonSnapshot) => {
  const picked = pickRace(snapshot, new Date())
  const info = picked ? circuitFor(picked.race.circuit.circuitId) : undefined

  return picked && info ? { picked, info } : null
}

export const bandShown = (snapshot: SeasonSnapshot) => (bandFor(snapshot) ? firstFrame : undefined)

class CircuitGuard extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override componentDidCatch() {
    this.props.onError()
  }

  override render() {
    return this.state.failed ? null : this.props.children
  }
}

export function CircuitBand() {
  const season = useSeason()
  const band = season.data ? bandFor(season.data) : null

  return band ? <Band picked={band.picked} info={band.info} /> : null
}

type BandProps = { picked: PickedRace; info: CircuitInfo }

function Band({ picked, info }: BandProps) {
  const { theme } = useTheme()
  const mounted = useMounted()
  const root = useRef<HTMLElement>(null)
  const progress = useRef(0)
  const live = useRef(false)
  const fill = useRef(0)
  const tilt = useRef(0)
  const tag = useRef<HTMLElement>(null)
  const pins = useRef<HTMLDivElement>(null)
  const [glReady, setGlReady] = useState(false)
  const shown = theme ?? 'light'

  const [glFailed, setGlFailed] = useState(false)

  const onReady = useCallback(() => {
    setGlReady(true)
    drawn()
  }, [])

  const onFail = useCallback(() => {
    setGlFailed(true)
    drawn()
  }, [])

  useGSAP(
    () => {
      const section = root.current

      if (!section) return

      for (const el of section.querySelectorAll<HTMLElement>('.type, h2.display, .foot-note')) sweep(el)

      for (const el of section.querySelectorAll<HTMLElement>('[data-count]')) roll(el, { from: el.dataset.count === 'year' ? 1950 : undefined })

      if (REDUCED) {
        progress.current = 1
        fill.current = 1

        return
      }

      const wide = section.querySelector<HTMLElement>('.held')
      const narrow = section.querySelector<HTMLElement>('.grid > div')
      const mm = gsap.matchMedia()

      mm.add({ wide: '(min-width: 761px)', narrow: '(max-width: 760px)' }, (ctx) => {
        const held = ctx.conditions?.wide ? wide : narrow

        if (!held) return

        ScrollTrigger.create({
          trigger: held,
          pin: true,
          start: () => (held.offsetHeight > innerHeight ? 'top top' : 'center center'),
          invalidateOnRefresh: true,
          end: '+=150%',
          scrub: true,
          onUpdate: (s) => {
            progress.current = s.progress
            fill.current = Math.min(1, Math.max(0, (s.progress - 0.05) / 0.85))
          },
        })
        ScrollTrigger.create({ trigger: section, refreshPriority: -1, start: 'top bottom', end: 'bottom top', onToggle: (s) => void (live.current = s.isActive) })
      })
      ScrollTrigger.sort()
      ScrollTrigger.refresh()

      return () => mm.revert()
    },
    { scope: root, dependencies: [info.model] },
  )

  const { facts } = info

  return (
    <section className="weekend-sec" id="weekend" ref={root} aria-labelledby="circuit-name">
      <div className="held">
        <p className="mono type">
          {LABEL[picked.kind]} · Round {picked.round} of {picked.of}
        </p>
        <h2 id="circuit-name" className="display">
          {info.name},
          <br />
          {WHEN[picked.kind]}
        </h2>
        <div className="grid">
          <div>
            <div className="track" data-waiting={!REDUCED && !glReady && !glFailed ? '' : undefined}>
              <div className="inner">
                <img
                  className="poster"
                  src={`/circuits/${info.model}-${shown}.png`}
                  alt={`${info.name} in 3D. Sector one purple, sector two green, sector three yellow, with ${facts.turns} numbered turns.`}
                  hidden={glReady}
                />
                {mounted && !REDUCED && theme && (
                  <CircuitGuard onError={onFail}>
                    <Suspense fallback={null}>
                      <Circuit model={info.model} theme={theme} layout="wide" fill={fill} tilt={tilt} running={live} pins={pins} tag={tag} onLap={noop} onLapProgress={noop} onReady={onReady} />
                    </Suspense>
                  </CircuitGuard>
                )}
                <div className="pins" ref={pins} aria-hidden>
                  {info.pins.map((pin) => {
                    const n = String(pin.turn).padStart(2, '0')
                    const corner = info.corner?.turn === pin.turn ? info.corner.name : null

                    return (
                      <span key={pin.turn} data-pin={`turn-${pin.turn}`} className={corner ? 't1' : undefined} style={glReady ? undefined : { left: pct(pin.x), top: pct(pin.y) }}>
                        {n}
                        {corner && <span className="name">{`\n${corner}`}</span>}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className="legend mono">
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
            <p className="foot-note mono muted">Built in Blender from bacinger/f1-circuits (MIT) and NASA SRTM elevation.</p>
          </div>
          <dl className="facts">
            <div>
              <dt className="mono muted type">First GP</dt>
              <dd>
                <strong data-count="year">{facts.firstGp}</strong>
              </dd>
            </div>
            <div>
              <dt className="mono muted type">Circuit length</dt>
              <dd>
                <strong data-count="">{facts.lengthKm} km</strong>
              </dd>
            </div>
            <div>
              <dt className="mono muted type">Laps</dt>
              <dd>
                <strong data-count="">{facts.laps}</strong>
              </dd>
            </div>
            <div>
              <dt className="mono muted type">Race distance</dt>
              <dd>
                <strong data-count="">{facts.distanceKm} km</strong>
              </dd>
            </div>
            <span className="rule" />
            <div>
              <dt className="mono muted type">Turns · direction</dt>
              <dd>
                <strong className="small">
                  {facts.turns}, {facts.direction}
                </strong>
              </dd>
            </div>
            <Soon className="mono more">{picked.kind === 'this-weekend' ? 'This weekend on This season' : 'The calendar on This season'}</Soon>
          </dl>
        </div>
      </div>
    </section>
  )
}
