import { type PointerEvent, useState } from 'react'

import { useSecond } from '#/motion/client.ts'
import { whoLed } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { gpName } from '#/season/weekend.ts'
import { opposite, useTheme } from '#/shell/theme.ts'

const two = (n: number) => String(n).padStart(2, '0')

const rounds = (n: number) => `${n} ${n === 1 ? 'round' : 'rounds'}`

export function WhoLed({ snapshot }: { snapshot: SeasonSnapshot }) {
  const now = useSecond()
  const { theme } = useTheme()
  const [hovered, setHovered] = useState<number | null>(null)
  const led = whoLed(snapshot, now)

  if (!led) return null

  const { columns, leads } = led

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return

    const box = e.currentTarget.getBoundingClientRect()
    const round = Math.min(columns, Math.max(1, Math.floor(((e.clientX - box.left) / box.width) * columns) + 1))

    setHovered(round <= leads.length ? round : null)
  }

  const last = led.stints.at(-1)?.to ?? 0
  const liveRace = led.live === null ? undefined : snapshot.calendar.find((race) => race.round === led.live)
  const ahead = Array.from({ length: Math.max(0, led.columns - Math.max(last, led.live ?? 0)) }, (_, i) => Math.max(last, led.live ?? 0) + i + 1)
  const all = Array.from({ length: led.columns }, (_, i) => i + 1)
  const grid = { gridTemplateColumns: `repeat(${led.columns}, minmax(0, 1fr))` }
  const credits = [...new Set(led.stints.flatMap(({ person, photo }) => (photo === 'portrait' ? [person.portrait?.credit] : [person.car ? `Photo ${person.car.credit}` : undefined])))]

  return (
    <section className="who-led" data-theme={opposite(theme ?? 'light')} aria-labelledby="who-led">
      <p className="mono label">The title fight</p>
      <div className="intro">
        <h2 id="who-led" className="display">
          <span>Who led,</span>
          <span>and when.</span>
        </h2>
        <p className="copy">{led.line}</p>
      </div>
      <ol className="mono marks" style={grid} aria-hidden="true">
        {all.map((round) => (
          <li key={round} className={led.changes.includes(round) || round === led.live ? 'is-marked' : undefined}>
            <span className="flag">{led.changes.includes(round) ? 'Lead change' : round === led.live ? 'Now' : ''}</span>
            <span>{two(round)}</span>
          </li>
        ))}
      </ol>
      <div className="strip" style={grid} onPointerMove={onPointerMove} onPointerLeave={() => setHovered(null)}>
        {led.stints.map((stint) => {
          const span = stint.to - stint.from + 1
          const src = stint.photo === 'portrait' ? stint.person.portrait?.src : stint.person.car?.src
          const compact = span < 3

          return (
            <figure key={stint.from} className={`stint is-${stint.photo}${compact ? ' is-compact' : ''}${stint.current ? ' is-current' : ''}`} style={{ gridColumn: `${stint.from} / span ${span}`, borderTopColor: stint.person.colour }}>
              {src ? <img src={src} alt="" loading="lazy" /> : null}
              <i className="dividers" style={{ backgroundSize: `${100 / span}% 100%` }} />
              <figcaption>
                {compact ? <span className="mono code">{stint.person.code ?? stint.person.family}</span> : null}
                <span className="mono when">{stint.current ? `Leader · from R${stint.from}` : compact ? `R${stint.from} to R${stint.to}` : `Leader · R${stint.from} to R${stint.to}`}</span>
                {compact ? null : <span className="display family">{stint.person.family}</span>}
                <span className="mono count">{stint.current ? `${rounds(span)} so far` : `${rounds(span)} in front`}</span>
              </figcaption>
            </figure>
          )
        })}
        {led.live !== null && liveRace ? (
          <div className="live-round" style={{ gridColumn: `${led.live} / span 1` }}>
            <i className="dot" />
            <span className="mono">{gpName(liveRace)} · live this weekend</span>
          </div>
        ) : null}
        {ahead.map((round) => (
          <div key={round} className="to-race" style={{ gridColumn: `${round} / span 1` }} />
        ))}
        {hovered === null ? null : (
          <span className="mono chip" style={{ gridColumn: `${hovered} / span 1` }} aria-hidden="true">
            {`R${hovered} · +${leads[hovered - 1] ?? 0}`}
          </span>
        )}
      </div>
      <ol className="mono leads" style={grid}>
        {all.map((round) => (
          <li key={round} className={round === led.live ? 'is-live' : undefined}>
            {round <= led.leads.length ? `+${led.leads[round - 1] ?? 0}` : round === led.live ? 'Live' : '·'}
          </li>
        ))}
      </ol>
      <div className="mono legend">
        <span>Lead in points after each round</span>
        {ahead.length > 0 ? <span>Still to race</span> : null}
      </div>
      <p className="mono credit">{credits.filter((credit) => credit !== undefined).join(', ')}</p>
    </section>
  )
}
