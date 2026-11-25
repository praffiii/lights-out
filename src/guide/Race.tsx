import type { CSSProperties } from 'react'

import { Go } from '#/shell/Go.tsx'
import { opposite, useTheme } from '#/shell/theme.ts'

import { at, moments, trackDay } from './moments.ts'
import { VEGAS } from './vegas.ts'

const MOMENTS = moments(VEGAS)

const place = (lap: number): CSSProperties & { '--at': number } => ({ '--at': at(lap, VEGAS.laps) })

export function Race() {
  const { theme } = useTheme()

  return (
    <section className="race" data-theme={theme ? opposite(theme) : undefined} aria-labelledby="race">
      <div className="top mono">
        <p>{`${VEGAS.race} · ${trackDay(VEGAS.date)}`}</p>
        <p className="real">A real race</p>
      </div>
      <h2 id="race" className="display">
        <span className="hl">One race,</span>
        <span className="hl">eight chapters.</span>
      </h2>
      <p className="body">{`The ${VEGAS.race} Grand Prix, lap by lap. Each moment opens the chapter that explains it.`}</p>
      <div className="laps">
        <i className="ruler" aria-hidden />
        <ol>
          {MOMENTS.map((m) => (
            <li key={m.n} className={m.above ? 'above' : undefined} style={place(m.lap)}>
              <i className="tick" aria-hidden />
              <Go to={m.to}>
                <span className="sr">{`Chapter ${m.n}, ${m.chapter}. `}</span>
                <span className="mono when">{m.label}</span>
                <span className="display num" aria-hidden>
                  {m.n}
                </span>
                <span className="what">{m.text}</span>
              </Go>
            </li>
          ))}
        </ol>
      </div>
      <p className="mono drs">
        <Go to="/chapters/drs">09 · DRS</Go> is missing on purpose. The flap went away after 2025, so this race had none.
      </p>
    </section>
  )
}
