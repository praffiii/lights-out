import { useState } from 'react'

import { seasonBest, speedLine } from '#/speed/top.ts'
import { useSeason } from '#/season/use-season.ts'
import { Go } from '#/shell/Go.tsx'
import { useTheme } from '#/shell/theme.ts'

import { Term } from './Term.tsx'

export const MODES = [
  { id: 'corner', name: 'Corner Mode', sub: 'Flaps closed · more grip', poster: 'side-corner' },
  { id: 'straight', name: 'Straight Mode', sub: 'Flaps open · less drag', poster: 'side' },
] as const

export type Mode = (typeof MODES)[number]['id']

const KMH = new Intl.NumberFormat('en-GB')

function Speed() {
  const top = useSeason().data?.topSpeed
  const best = top ? seasonBest(top.races) : undefined

  return (
    <div className="speed">
      <p className="mono label">{top && best ? `Top speed, ${top.season}` : null}</p>
      <p className="display num">{best ? KMH.format(best.kmh) : null}</p>
      <p className="unit">{best ? 'km/h' : null}</p>
      <p className="line">{best ? speedLine(best) : null}</p>
      <p className="mono source">{best ? 'OpenF1 speed traps · updates after every race' : null}</p>
    </div>
  )
}

export function CarWings() {
  const theme = useTheme().theme ?? 'light'
  const [mode, setMode] = useState<Mode>('straight')
  const shown = MODES.find((m) => m.id === mode) ?? MODES[1]

  return (
    <section className="wings" aria-labelledby="wings">
      <div className="head">
        <p className="mono label">Active aero</p>
        <h2 id="wings" className="display headline">
          <span className="hl">Wings that move.</span>
        </h2>
        <p className="body">
          Both wings have <Term k="activeAero">flaps that move</Term>. Closed in the corners for grip, open on the straights to cut drag.
        </p>
      </div>
      <div className="deck">
        <Speed />
        <div className="aero">
          <div className="modes" role="tablist" aria-label="Wing mode">
            {MODES.map((m) => (
              <button key={m.id} type="button" role="tab" id={`mode-${m.id}`} aria-selected={mode === m.id} aria-controls="wing-stage" onClick={() => setMode(m.id)}>
                <span className="mono name">{m.name}</span>
                <span className="mono sub">{m.sub}</span>
              </button>
            ))}
          </div>
          <p className="mono sub-active" aria-hidden>
            {shown.sub}
          </p>
          <div className="stage" id="wing-stage" role="tabpanel" aria-labelledby={`mode-${mode}`}>
            <img src={`/car/${shown.poster}-${theme}.webp`} alt={`The 2026 car from the side in ${shown.name}, both wing flaps ${mode === 'straight' ? 'open' : 'closed'}.`} />
          </div>
        </div>
      </div>
      <div className="payoff">
        <p className="mono so">So</p>
        <p className="what">
          Every car gets <Term k="straightMode">Straight Mode</Term> on the straights.
        </p>
        <p className="mono extra">
          <Term k="overtakeMode">Overtake Mode</Term> is the <Go to="/chapters/overtaking">chaser&apos;s extra →</Go>
        </p>
      </div>
    </section>
  )
}
