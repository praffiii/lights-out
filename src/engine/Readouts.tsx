import type { PoleLap } from '#/pole/schema.ts'

import { batteryAt, readouts, STATES } from './phase.ts'

type Props = {
  lap: PoleLap
  initialT: number
}

export function Readouts({ lap, initialT }: Props) {
  const r = readouts(lap, initialT)
  const state = STATES[r.phase]
  const level = batteryAt(lap, initialT)

  return (
    <dl className="readouts">
      <div>
        <dt className="mono muted">Speed</dt>
        <dd className="val" data-speed>
          {r.speed}
        </dd>
        <dd className="mono muted note" data-peak>
          {r.peak}
        </dd>
      </div>
      <div>
        <dt className="mono muted">Engine</dt>
        <dd className="val" data-rpm>
          {r.rpm}
        </dd>
        <dd className="mono muted note" data-gear>
          {r.gear}
        </dd>
      </div>
      <div>
        <dt className="mono muted">MGU-K</dt>
        <dd className="val" data-mguk>
          {state.mguK.word}
        </dd>
        <dd className="mono muted note" data-mguk-note>
          {state.mguK.note}
        </dd>
      </div>
      <div>
        <dt className="mono muted">Battery</dt>
        <dd className="val battery-val">
          <span data-battery>{state.battery}</span>
          <span className="level" aria-hidden>
            <i data-battery-bar style={{ transform: `scaleX(${level.toFixed(3)})` }} />
          </span>
        </dd>
        <dd className="mono muted note">Estimated</dd>
      </div>
    </dl>
  )
}
