import { useState } from 'react'

import { opposite, useTheme } from '#/shell/theme.ts'
import { Go } from '#/shell/Go.tsx'

import { DAYS, FOOTNOTE } from './content.ts'
import type { Format } from './page-model.ts'

const LABEL: Record<Format, string> = { standard: 'Standard', sprint: 'Sprint' }

export function Days({ initial, now }: { initial: Format; now: string | null }) {
  const [format, setFormat] = useState(initial)
  const { theme } = useTheme()

  return (
    <section className="days" data-theme={theme ? opposite(theme) : undefined} aria-labelledby="days">
      <div className="head">
        <h2 id="days" className="mono">{`The weekend · ${LABEL[format]} format`}</h2>
        <div className="mono seg" role="group" aria-label="Weekend format">
          {(['standard', 'sprint'] as const).map((f) => (
            <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f)}>
              {LABEL[f]}
            </button>
          ))}
        </div>
      </div>
      <ol className="cols">
        {DAYS[format].map((d) => (
          <li key={d.day} className={d.day === 'Sun.' ? 'col sun' : 'col'}>
            <p className="display day">{d.day}</p>
            <p className="line">{d.line}</p>
            <ul>
              {d.sessions.map((s) => (
                <li key={s.name}>
                  <span className="name">{s.name}</span>
                  <span className="mono">{s.length}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="mono foot">{FOOTNOTE[format]}</p>
      {now ? (
        <p className="mono now">
          {now} · <Go to="/weekend">Full weekend →</Go>
        </p>
      ) : null}
    </section>
  )
}
