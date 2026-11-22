import type { CSSProperties, ReactNode } from 'react'

import type { PartId } from '#/engine/phase.ts'
import { type EnginePart, PARTS, rig } from '#/engine/rig.ts'
import { useTheme } from '#/shell/theme.ts'

import { Term } from './Term.tsx'

type Layout = {
  elbow: readonly [number, number]
  end: readonly [number, number]
  card: { left: number; top: number; width: number; align: 'left' | 'right' }
}

const LAYOUT: Record<PartId, Layout> = {
  v6: { elbow: [0.5771, 0.11], end: [0.43, 0.11], card: { left: 0.14, top: 0.06, width: 0.27, align: 'right' } },
  turbo: { elbow: [0.75, 0.145], end: [0.75, 0.145], card: { left: 0.76, top: 0.1, width: 0.22, align: 'left' } },
  mguK: { elbow: [0.73, 0.6309], end: [0.73, 0.67], card: { left: 0.74, top: 0.63, width: 0.24, align: 'left' } },
  energyStore: { elbow: [0.46, 0.8515], end: [0.46, 0.8515], card: { left: 0.47, top: 0.8, width: 0.24, align: 'left' } },
  electronics: { elbow: [0.22, 0.4184], end: [0.22, 0.4184], card: { left: 0.01, top: 0.37, width: 0.2, align: 'right' } },
}

const PHONE_SCALE = (1920 / 1200) / (390 / 340)

const pct = (v: number) => `${(v * 100).toFixed(2)}%`

type Spot = CSSProperties & Record<'--px' | '--py', string>

const phoneSpot = (id: PartId): Spot => {
  const [x, y] = rig.pins[id] ?? [0.5, 0.5]

  return { '--px': pct(0.5 + (x - 0.5) * PHONE_SCALE), '--py': pct(y) }
}

function JobText({ part }: { part: EnginePart }) {
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
    <p className="job">
      {pieces}
      {rest}
    </p>
  )
}

export function FiveParts() {
  const theme = useTheme().theme ?? 'light'

  return (
    <section className="five-parts" aria-labelledby="five-parts">
      <div className="head">
        <p className="mono label">The power unit · 2026 rules</p>
        <h2 id="five-parts" className="display headline">
          <span className="hl">Five parts.</span>
          <span className="hl">One power unit.</span>
        </h2>
        <p className="body">Two engines in one: a petrol V6 and an electric motor, with a battery between them. Each part has one job.</p>
      </div>
      <div className="stage">
        <img src={`/engine/exploded-${theme}.webp`} alt="A 2026 Formula 1 power unit exploded into its five parts: V6 engine, turbocharger, MGU-K, energy store and control electronics." />
        <svg className="stems" viewBox="0 0 1000 625" preserveAspectRatio="none" aria-hidden>
          {PARTS.map((part) => {
            const [x, y] = rig.pins[part.id] ?? [0.5, 0.5]
            const { elbow, end } = LAYOUT[part.id]
            const points = `${(x * 1000).toFixed(1)},${(y * 625).toFixed(1)} ${(elbow[0] * 1000).toFixed(1)},${(elbow[1] * 625).toFixed(1)} ${(end[0] * 1000).toFixed(1)},${(end[1] * 625).toFixed(1)}`

            return (
              <g key={part.id}>
                <polyline points={points} />
                <circle cx={x * 1000} cy={y * 625} r="4" />
              </g>
            )
          })}
        </svg>
        <div className="pins">
          {PARTS.map((part) => {
            const { card } = LAYOUT[part.id]

            return (
              <div className={`pin align-${card.align}`} key={part.id} style={{ left: pct(card.left), top: pct(card.top), width: pct(card.width) }}>
                <div className="pin-head">
                  <span className="mono pin-tag">{part.n}</span>
                  <strong className="name">{part.name}</strong>
                </div>
                <JobText part={part} />
              </div>
            )
          })}
        </div>
        <div className="phone-tags" aria-hidden>
          {PARTS.map((part) => (
            <span className="mono tag" key={part.id} style={phoneSpot(part.id)}>
              {part.n}
            </span>
          ))}
        </div>
      </div>
      <ol className="part-rows">
        {PARTS.map((part) => (
          <li key={part.id}>
            <span className="mono n">{part.n}</span>
            <div className="copy">
              <strong className="name">{part.name}</strong>
              <JobText part={part} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
