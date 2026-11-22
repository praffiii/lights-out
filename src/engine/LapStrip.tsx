import type { TurnLap } from '#/circuits/registry.ts'
import { SECTORS } from '#/circuits/shaders.ts'
import { sampleAt, timeAt } from '#/pole/replay.ts'
import type { PoleLap } from '#/pole/schema.ts'

export const shortClock = (t: number) => {
  const tenths = Math.round(t * 10)
  const minutes = Math.floor(tenths / 600)
  const seconds = Math.floor((tenths % 600) / 10)

  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % 10}`
}

export const stripValueText = (lap: PoleLap, t: number) => `${shortClock(t)}, ${Math.round(sampleAt(lap, t).speed)} km/h`

const SECTOR_KEYS = ['S1', 'S2', 'S3'] as const

type Props = {
  lap: PoleLap
  turns: ReadonlyArray<TurnLap>
  initialT: number
}

export function LapStrip({ lap, turns, initialT }: Props) {
  const pct = (t: number) => `${((t / lap.time) * 100).toFixed(3)}%`
  const ticks = turns.map((turn) => ({ turn: turn.turn, t: timeAt(lap, turn.u) }))

  return (
    <div className="strip-wrap">
      <div className="sectors mono">
        {lap.sectors.map((sec, i) => {
          const key = SECTOR_KEYS[i] ?? 'S1'

          return (
            <span key={key} style={{ flexGrow: sec, borderColor: SECTORS[key] }}>
              {`${key} ${sec.toFixed(3)}`}
            </span>
          )
        })}
      </div>
      <div
        className="strip"
        role="slider"
        tabIndex={0}
        aria-label="Position in the pole lap"
        aria-valuemin={0}
        aria-valuemax={Number(lap.time.toFixed(3))}
        aria-valuenow={Number(initialT.toFixed(2))}
        aria-valuetext={stripValueText(lap, initialT)}
      >
        <div className="sector-bars" aria-hidden>
          {lap.sectors.map((sec, i) => {
            const key = SECTOR_KEYS[i] ?? 'S1'

            return <i key={key} style={{ flexGrow: sec, background: SECTORS[key] }} />
          })}
        </div>
        <i className="fill" data-progress style={{ width: pct(initialT) }} aria-hidden />
        <i className="head" data-head style={{ left: pct(initialT) }} aria-hidden />
      </div>
      <div className="ticks mono" aria-hidden>
        {ticks.map((tick) => (
          <span className="tick" key={tick.turn} data-tick={tick.turn} style={{ left: pct(tick.t) }}>
            <span>{`T${tick.turn}`}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
