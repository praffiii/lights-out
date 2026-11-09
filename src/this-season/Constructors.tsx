import { useState } from 'react'

import { constructorRows } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

const two = (n: number) => String(n).padStart(2, '0')

const SHADES = [100, 55, 30]

const shade = (colour: string, i: number) => `color-mix(in srgb, ${colour} ${SHADES[i] ?? 30}%, var(--bg))`

export function Constructors({ snapshot }: { snapshot: SeasonSnapshot }) {
  const [all, setAll] = useState(false)
  const rows = constructorRows(snapshot)

  if (rows.length === 0) return null

  const scale = Math.max(1, ...rows.map((row) => row.total))
  const shown = all ? rows : rows.slice(0, 5)
  const more = rows.length - 5

  return (
    <section className="constructors" aria-labelledby="constructors">
      <p className="mono label">Constructors&apos; championship</p>
      <div className="intro">
        <h2 id="constructors" className="display">
          <span>Two drivers,</span>
          <span>one team score.</span>
        </h2>
        <p className="copy">A team&apos;s score is just its two drivers added up. A fast car only wins this one if both seats bring the points home.</p>
      </div>
      <ol className="teams">
        {shown.map((row) => (
          <li key={row.team.id} className="team-row">
            <span className="mono pos">{two(row.position)}</span>
            <span className="team">{row.team.name}</span>
            <div className="sum">
              {row.parts.map((part, i) => (
                <span key={part.label} className="part">
                  {i > 0 ? <i className="plus">+</i> : null}
                  <span className="mono who">
                    <i className="dot" style={{ background: shade(row.team.colour, i) }} />
                    {part.label}
                  </span>
                  <b>{part.points}</b>
                </span>
              ))}
              <span className="total">
                {row.parts.length > 0 ? <i className="eq">=</i> : null}
                <span className="mono who">Team</span>
                <b>{row.total}</b>
              </span>
            </div>
            <div className="shares">
              {(row.parts.length > 0 ? row.parts : [{ label: 'Team', points: row.total }]).map((part, i) => (
                <span
                  key={part.label}
                  className="share"
                  style={{ width: `${(part.points / scale) * 100}%`, background: shade(row.team.colour, i) }}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>
      {more > 0 && !all ? (
        <button type="button" className="mono more" onClick={() => setAll(true)}>
          {more} more teams · Show all
        </button>
      ) : null}
    </section>
  )
}
