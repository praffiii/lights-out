import { useState } from 'react'

import { type DriverRow, driverRows, driversCopy } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

import { Shot } from './Fighter.tsx'

const two = (n: number) => String(n).padStart(2, '0')

function Podium({ row, leader }: { row: DriverRow; leader: boolean }) {
  const behind = row.gap === '' ? 'Leader' : `${row.gap.slice(1)} pts behind`

  return (
    <figure className={leader ? 'is-p1' : undefined}>
      <div className="frame" style={{ borderBottomColor: row.team.colour }}>
        <Shot person={{ ...row.person, portrait: undefined }} />
        {leader ? <img className="brackets" src="/img/viewfinder.svg" alt="" width={420} height={540} /> : null}
      </div>
      <figcaption>
        <span className={`mono place${leader ? ' is-leader' : ''}`}>
          P{row.position} · {row.team.name} · {behind}
        </span>
        <span className="display family">{row.person.family}</span>
        <span className="pts">{row.points}</span>
      </figcaption>
    </figure>
  )
}

export function Drivers({ snapshot }: { snapshot: SeasonSnapshot }) {
  const [all, setAll] = useState(false)
  const rows = driverRows(snapshot)

  if (!rows) return null

  const [first, ...chasers] = rows.podium
  const shown = all ? rows.rest : rows.rest.slice(0, 7)
  const more = rows.rest.length - 7
  const credit = rows.podium.find((row) => row.person.car)?.person.car?.credit

  return (
    <section className="drivers" aria-labelledby="drivers">
      <p className="mono label">Drivers&apos; championship</p>
      <div className="intro">
        <h2 id="drivers" className="display">
          <span>The championship</span>
          <span>is a race too.</span>
        </h2>
        <p className="copy">{driversCopy([...rows.podium, ...rows.rest])}</p>
      </div>
      <div className="podium">
        {first ? <Podium row={first} leader /> : null}
        <div className="chasers">
          {chasers.map((row) => (
            <Podium key={row.person.name} row={row} leader={false} />
          ))}
        </div>
      </div>
      <table className="tower">
        <thead className="mono">
          <tr>
            <th>Pos</th>
            <th>Driver</th>
            <th>Team</th>
            <th>Points</th>
            <th>Gap to leader</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr key={`${row.position}-${row.person.name}`}>
              <td className="mono pos">{two(row.position)}</td>
              <td className="driver" style={{ borderLeftColor: row.team.colour }}>
                <span className="mono code">{row.person.code ?? ''}</span>
                <span className="name">{row.person.name}</span>
              </td>
              <td className="mono team">{row.team.name}</td>
              <td className="pts">
                <span>{row.points}</span>
              </td>
              <td className="gap">{row.gap}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mono foot">
        {more > 0 && !all ? (
          <button type="button" onClick={() => setAll(true)}>
            {more} more drivers · Show all
          </button>
        ) : (
          <span />
        )}
        {credit ? <span className="muted">Photos {credit}</span> : null}
      </div>
    </section>
  )
}
