import type { CSSProperties } from 'react'

import { type Part, PARTS, rig } from '#/car/parts.ts'
import { opposite, useTheme } from '#/shell/theme.ts'

import { Term } from './Term.tsx'

const CREDIT = "3D car by MaG80 · CC BY 4.0 · a fan design to the 2026 rules, not any team's car · front and rear wing flaps move"

type Spot = CSSProperties & Record<'--x' | '--y' | '--px' | '--py', string>

const pct = (v: number) => `${(v * 100).toFixed(2)}%`

const spot = (id: Part['id']): Spot => {
  const [x, y] = rig.posters.exploded[id] ?? [0, 0]
  const [px, py] = rig.posters.explodedPhone[id] ?? [0, 0]

  return { '--x': pct(x), '--y': pct(y), '--px': pct(px), '--py': pct(py) }
}

export function Job({ part }: { part: Part }) {
  const pieces: Array<React.ReactNode> = []
  let rest: string = part.job

  for (const { text, k } of part.terms) {
    const at = rest.indexOf(text)

    if (at < 0) continue

    pieces.push(rest.slice(0, at), <Term key={k} k={k}>{text}</Term>)
    rest = rest.slice(at + text.length)
  }

  return (
    <p className="job">
      {pieces}
      {rest}
    </p>
  )
}

export function CarParts() {
  const theme = useTheme().theme
  const band = theme ? opposite(theme) : 'dark'

  return (
    <>
      <section className="apart" data-theme={theme ? band : undefined} aria-labelledby="apart">
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
            {PARTS.map((part) => (
              <li key={part.id} data-part={part.id}>
                <p className="row">
                  <span className="mono n">{part.n}</span>
                  <span className="name">{part.name}</span>
                  <span className="mono fact">{part.fact}</span>
                </p>
                <Job part={part} />
              </li>
            ))}
          </ol>
          <div className="stage">
            <picture>
              <source media="(max-width: 760px)" srcSet={`/car/exploded-phone-${band}.webp`} />
              <img src={`/car/exploded-${band}.webp`} alt="A 2026 car taken apart into its eight parts: front wing, survival cell, halo, sidepods, floor, power unit, rear wing and tyres." />
            </picture>
            {PARTS.map((part) => (
              <span className="mono tag" key={part.id} style={spot(part.id)} aria-hidden>
                {part.n}
              </span>
            ))}
          </div>
        </div>
      </section>
      <p className="mono muted credit apart-credit">{CREDIT}</p>
    </>
  )
}
