import { grandPrix } from '#/circuits/calendar.ts'
import type { CircuitInfo } from '#/circuits/registry.ts'
import { clock } from '#/pole/replay.ts'
import type { PoleLap } from '#/pole/schema.ts'
import { capital, words } from '#/season/words.ts'

import type { Braking as Numbers } from './braking.ts'

type Stat = { label: string; short: string; value: string; unit?: string; line: string }

const family = (driver: string) => driver.split(' ').at(-1) ?? driver

const statsOf = ({ biggest, zones, flatShare, flatSeconds }: Numbers): ReadonlyArray<Stat> => [
  { label: `Into Turn ${biggest.turn}`, short: `Into T${biggest.turn}`, value: String(Math.round(biggest.entry)), unit: 'km/h', line: `Down to ${Math.round(biggest.min)} km/h` },
  { label: 'On the brakes', short: 'On the brakes', value: biggest.seconds.toFixed(1), unit: 's', line: `About ${biggest.metres} metres` },
  { label: 'Flat out', short: 'Flat out', value: String(Math.round(flatShare * 100)), unit: '%', line: `${flatSeconds.toFixed(1)} s of the lap` },
  { label: 'Braking zones', short: 'Braking zones', value: String(zones.length), line: 'On one lap' },
]

export function Braking({ numbers, lap, info }: { numbers: Numbers; lap: PoleLap; info: CircuitInfo }) {
  return (
    <section className="braking" aria-labelledby="braking">
      <div className="head">
        <p className="mono muted label">Braking</p>
        <h2 id="braking" className="display">
          <span className="hl">{capital(words(numbers.zones.length))}</span> <span className="hl">stops.</span>
        </h2>
        <p className="body">
          {`Measured on ${family(lap.driver)}'s pole lap, ${lap.year}, ${clock(lap.time)}. The biggest stop is into Turn ${numbers.biggest.turn}.`}
          {lap.wet ? <span className="mono wet">Wet</span> : null}
        </p>
      </div>
      <dl className="stats">
        {statsOf(numbers).map((stat) => (
          <div key={stat.label} className="stat">
            <dt className="mono muted">
              <span className="full">{stat.label}</span>
              <span className="short">{stat.short}</span>
            </dt>
            <dd>
              <span className="value">
                <span className="num">{stat.value}</span>
                {stat.unit ? <span className="unit">{stat.unit}</span> : null}
              </span>
              <span className="line">{stat.line}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="payoff">
        <span className="mono">So</span>
        <span>{`${Math.round(numbers.brakingSeconds)} seconds a lap on the brakes, ${Math.round(numbers.flatSeconds)} flat out.`}</span>
      </p>
      <p className="mono muted credit">{`Telemetry: OpenF1 · ${lap.year} ${grandPrix(info.gp)} qualifying, pole lap · brake on/off, about four samples a second`}</p>
    </section>
  )
}
