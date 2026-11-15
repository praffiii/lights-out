import { type CSSProperties, type KeyboardEvent, lazy, type ReactNode, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { type Part, PARTS, rig } from '#/car/parts.ts'
import { END, partLabel, stageAt, STOPS } from '#/car/stage.ts'
import { CircuitGuard } from '#/circuits/CircuitGuard.tsx'
import { useMedia } from '#/motion/client.ts'
import { REDUCED, ScrollTrigger } from '#/motion/motion.ts'
import { opposite, useTheme } from '#/shell/theme.ts'

import { linearPace } from './pace.ts'
import { Term } from './Term.tsx'
import { useScrub } from './useScrub.ts'

const PartsScene = lazy(() => import('#/car/PartsScene.tsx'))

const CREDIT = "3D car by MaG80 · CC BY 4.0 · a fan design to the 2026 rules, not any team's car · front and rear wing flaps move"

const PHONE = '(max-width: 760px)'

const PACE = linearPace(END)

const ROW_KEYS = new Map([
  ['ArrowDown', 1],
  ['ArrowUp', -1],
])

type Spot = CSSProperties & Record<'--x' | '--y' | '--px' | '--py', string>

const pct = (v: number) => `${(v * 100).toFixed(2)}%`

const spot = (id: Part['id']): Spot => {
  const [x, y] = rig.posters.exploded[id] ?? [0, 0]
  const [px, py] = rig.posters.explodedPhone[id] ?? [0, 0]

  return { '--x': pct(x), '--y': pct(y), '--px': pct(px), '--py': pct(py) }
}

const valueText = (i: number) => `${partLabel(i)} · ${PARTS[i]?.name ?? ''}`

export function Job({ part }: { part: Part }) {
  const pieces: Array<ReactNode> = []
  let rest: string = part.job

  for (const { text, k } of part.terms) {
    const at = rest.indexOf(text)

    if (at < 0) continue

    pieces.push(
      rest.slice(0, at),
      <Term key={k} k={k}>
        {text}
      </Term>,
    )
    rest = rest.slice(at + text.length)
  }

  return (
    <p className="job" id={`job-${part.id}`}>
      {pieces}
      {rest}
    </p>
  )
}

const painter = (redraw: { current: () => void }) => (scope: HTMLElement) => {
  const list = scope.querySelector('.parts')
  const rows = [...scope.querySelectorAll<HTMLElement>('.parts li')]
  const ticks = [...scope.querySelectorAll<HTMLElement>('.rail i')]
  const tags = [...scope.querySelectorAll<HTMLElement>('[data-tag]')]
  const track = scope.querySelector('[role="slider"]')
  const count = scope.querySelector('.count')
  const chip = scope.querySelector<HTMLElement>('.chip')
  const label = chip?.querySelector('b')
  let shown: number | null | undefined

  return (t: number) => {
    if (REDUCED) return

    const { lit } = stageAt(t)

    redraw.current()

    if (lit === shown) return

    shown = lit

    const at = lit ?? 0

    const typing = list?.contains(document.activeElement) ?? false

    for (const [i, row] of rows.entries()) {
      const button = row.querySelector<HTMLElement>('.row')

      row.toggleAttribute('data-active', i === lit)
      button?.setAttribute('aria-expanded', String(i === lit))

      if (typing && i === lit) button?.focus({ preventScroll: true })
    }

    for (const [i, tick] of ticks.entries()) tick.toggleAttribute('data-on', i === at)

    for (const [i, tag] of tags.entries()) tag.toggleAttribute('data-lit', i === lit)

    track?.setAttribute('aria-valuenow', String(at + 1))
    track?.setAttribute('aria-valuetext', valueText(at))

    if (count) count.textContent = partLabel(at)

    const part = PARTS[at]

    if (chip && part) {
      chip.toggleAttribute('hidden', lit === null)

      for (const [k, v] of Object.entries(spot(part.id))) chip.style.setProperty(k, String(v))

      chip.style.removeProperty('left')
      chip.style.removeProperty('top')

      if (label) label.textContent = `${part.n} · ${part.name}`
    }
  }
}

export function CarParts() {
  const theme = useTheme().theme
  const band = theme ? opposite(theme) : 'dark'
  const root = useRef<HTMLElement>(null)
  const tags = useRef<HTMLDivElement>(null)
  const awake = useRef(false)
  const redraw = useRef(() => {})
  const phone = useMedia(PHONE)
  const [live, setLive] = useState(false)
  const [near, setNear] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const { time, seek } = useScrub(root, END, STOPS, PACE, painter(redraw))

  useEffect(() => setLive(!REDUCED), [])

  useLayoutEffect(() => {
    if (live) ScrollTrigger.refresh()
  }, [live])

  useEffect(() => {
    const el = root.current

    if (!el || REDUCED) return

    const nearby = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '100% 0px' })

    const seen = new IntersectionObserver((entries) => {
      awake.current = entries.some((e) => e.isIntersecting)

      redraw.current()
    })

    nearby.observe(el)
    seen.observe(el)

    return () => {
      nearby.disconnect()
      seen.disconnect()
    }
  }, [])

  const onKey = (i: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = ROW_KEYS.get(e.key)
    const to = i + (step ?? 0)

    if (step === undefined || to < 0 || to >= PARTS.length) return

    e.preventDefault()
    seek.current(to + 1)
  }

  return (
    <>
      <section className="apart" data-theme={theme ? band : undefined} data-live={live ? '' : undefined} aria-labelledby="apart" ref={root}>
        <div className="pin">
          <div className="head">
            <p className="mono label">The car · 2026 rules</p>
            <h2 id="apart" className="display headline">
              <span className="hl">Take it apart.</span>
            </h2>
            <p className="mono hint">
              <span className="full">Scroll to take it apart · one part at a time</span>
              <span className="short">Scroll to take it apart</span>
            </p>
          </div>
          <div className="deck">
            <ol className="parts">
              {PARTS.map((part, i) => {
                const row = (
                  <>
                    <span className="mono n">{part.n}</span>
                    <span className="name">{part.name}</span>
                    <span className="mono fact">{part.fact}</span>
                  </>
                )

                return (
                  <li key={part.id} data-part={part.id}>
                    {live ? (
                      <button type="button" className="row" aria-expanded={false} aria-controls={`job-${part.id}`} onClick={() => seek.current(i + 1)} onKeyDown={onKey(i)}>
                        {row}
                      </button>
                    ) : (
                      <p className="row">{row}</p>
                    )}
                    <Job part={part} />
                  </li>
                )
              })}
            </ol>
            <div className="stage" data-gl={ready ? '' : undefined} data-failed={failed ? '' : undefined}>
              <div className="frame">
                <picture>
                  <source media="(max-width: 760px)" srcSet={`/car/exploded-phone-${band}.webp`} />
                  <img src={`/car/exploded-${band}.webp`} alt="A 2026 car taken apart into its eight parts: front wing, survival cell, halo, sidepods, floor, power unit, rear wing and tyres." />
                </picture>
                {live && near && !failed ? (
                  <div className="gl">
                    <CircuitGuard onError={() => setFailed(true)}>
                      <Suspense fallback={null}>
                        <PartsScene band={band} phone={phone} time={time} awake={awake} redraw={redraw} tags={tags} onReady={() => setReady(true)} />
                      </Suspense>
                    </CircuitGuard>
                  </div>
                ) : null}
                <div className="tags" ref={tags} aria-hidden>
                  {PARTS.map((part) => (
                    <span className="mono tag" key={part.id} data-tag={part.id} style={spot(part.id)}>
                      {part.n}
                    </span>
                  ))}
                  <span className="mono chip" hidden>
                    <b />
                  </span>
                </div>
              </div>
              {failed ? <p className="mono muted fail">The 3D car could not load.</p> : null}
            </div>
          </div>
          <div className="foot">
            <div className="rail" role="slider" tabIndex={0} aria-label="Part of the car" aria-valuemin={1} aria-valuemax={END} aria-valuenow={1} aria-valuetext={valueText(0)}>
              {PARTS.map((part) => (
                <i key={part.id} />
              ))}
            </div>
            <p className="mono scroll">Scroll ↓</p>
            <p className="mono count">{partLabel(0)}</p>
          </div>
        </div>
      </section>
      <p className="mono muted credit apart-credit">{CREDIT}</p>
    </>
  )
}
