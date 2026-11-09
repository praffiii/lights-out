import { Fragment } from 'react'

import { useSecond } from '#/motion/client.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

import { weekendIcs } from './ics.ts'
import { clockDigits, type WeekendPage } from './page-model.ts'

const download = (snapshot: SeasonSnapshot) => {
  const ics = weekendIcs(snapshot, new Date())

  if (!ics) return

  const url = URL.createObjectURL(new Blob([ics.body], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')

  link.href = url
  link.download = ics.filename
  link.click()
  URL.revokeObjectURL(url)
}

export function Clock({ page, snapshot }: { page: WeekendPage; snapshot: SeasonSnapshot }) {
  const now = useSecond()
  const { clock } = page

  return (
    <section className="clock" aria-label="Countdown">
      {clock ? (
        <>
          <div className="mono clock-head">
            <p>{clock.label}</p>
            <p>{clock.yours ? `${clock.track} · ${clock.yours}` : clock.track}</p>
          </div>
          <p className="digits" role="timer" aria-live="off">
            {clockDigits(clock, now.getTime()).map((digit, i) => (
              <Fragment key={digit.unit}>
                {i > 0 ? (
                  <span className="colon" aria-hidden>
                    :
                  </span>
                ) : null}
                <span className="group">
                  <span className="value">{digit.value}</span>
                  <span className="mono unit">{digit.unit}</span>
                </span>
              </Fragment>
            ))}
          </p>
        </>
      ) : (
        <p className="display flag">{page.flag}</p>
      )}
      <div className="clock-foot">
        <p className="note">{page.note}</p>
        <button type="button" className="add" onClick={() => download(snapshot)}>
          Add the weekend to your calendar <span className="arr">→</span>
        </button>
      </div>
    </section>
  )
}
