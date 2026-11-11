import { CircuitStage, stageCredit, useNearLap } from './CircuitStage.tsx'
import type { Band } from './page-model.ts'

function Stat({ label, value, unit, num }: { label: string; value: string | number; unit?: string; num?: 'num' | 'num year' }) {
  return (
    <div>
      <dt className="mono">{label}</dt>
      <dd>
        <span className={num}>{value}</span>
        {unit ? <span className="mono unit">{unit}</span> : null}
      </dd>
    </div>
  )
}

export function CircuitBand({ band }: { band: Band }) {
  const { info, facts } = band
  const { near, onNear, lap } = useNearLap(info?.id ?? '')

  return (
    <section className="band circuit" data-theme="dark" aria-label="The circuit">
      <div className="card">
        <dl className="figures">
          <Stat label="When" value={band.when} />
          {facts ? <Stat label="Length" value={facts.lengthKm} unit="km" num="num" /> : null}
          {info ? <Stat label="Distance" value={info.facts.distanceKm} unit="km" num="num" /> : null}
          {facts ? <Stat label="Laps" value={facts.laps} num="num" /> : null}
          {facts ? <Stat label="First Grand Prix" value={facts.firstGp} num="num year" /> : null}
        </dl>
        <div className="schedule">
          <p className="mono">{`Schedule · your time · ${band.zone}`}</p>
          <ul>
            {band.schedule.map((row) => (
              <li key={row.label} className={`is-${row.state}`}>
                <span className="name">{row.label}</span>
                <span className="mono day">{row.day}</span>
                <span className="mono time">{row.time}</span>
              </li>
            ))}
          </ul>
        </div>
        {info ? <CircuitStage info={info} near={near} lap={lap} onNear={onNear} /> : null}
      </div>
      {info ? <p className="mono credit">{stageCredit(lap)}</p> : null}
    </section>
  )
}
