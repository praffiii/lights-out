import { type RefObject, useEffect, useRef, useState } from 'react'
import { preload } from 'react-dom'

import { REDUCED, roll, useGSAP, wipe } from '#/motion/motion.ts'

import { CARS } from './cars.ts'

type TrackerProps = { at: number; onPick: (i: number) => void; lap: RefObject<HTMLElement | null>; paused: boolean; onPause: () => void }

const pad = (n: number) => String(n).padStart(2, '0')

export function Tracker({ at, onPick, lap, paused, onPause }: TrackerProps) {
  const root = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState<{ now: number; out: number | null }>({ now: at, out: null })

  if (shown.now !== at) setShown({ now: at, out: shown.now })

  const now = CARS[at]
  const out = shown.out === null ? undefined : CARS[shown.out]
  const next = CARS[(at + 1) % CARS.length]

  useEffect(() => {
    if (next) preload(next.src, { as: 'image' })
  }, [next])

  useGSAP(
    () => {
      const el = root.current

      if (!el) return

      const line = el.querySelector<HTMLElement>('.on')

      if (line) roll(line, { from: shown.out === null ? undefined : (shown.out + 1) * 100 + CARS.length })

      if (shown.out === null) return

      const clear = () => setShown((s) => ({ ...s, out: null }))
      const incoming = el.querySelector<HTMLElement>('.shot[data-in]')

      if (REDUCED || !incoming) clear()
      else wipe(incoming).eventCallback('onComplete', clear)
    },
    { dependencies: [at], scope: root, revertOnUpdate: true },
  )

  if (!now) return null

  return (
    <div className="tracker" ref={root}>
      <div className="shots">
        {out && (
          <figure className="shot" key={out.code} aria-hidden="true">
            <img src={out.src} alt="" width={1600} height={800} />
          </figure>
        )}
        <figure className="shot" key={now.code} data-in="">
          <img src={now.src} alt={`${now.driver}'s ${now.team} ${now.car}`} width={1600} height={800} fetchPriority="high" />
          <figcaption>
            <a href={now.commons} target="_blank" rel="noreferrer">
              {now.credit}
            </a>
          </figcaption>
        </figure>
      </div>
      <div className="ticks">
        {CARS.map((car, i) => (
          <button
            type="button"
            className="tick"
            key={car.code}
            data-code={car.code}
            aria-label={`Show ${car.driver}, ${car.team} ${car.car}`}
            aria-current={i === at ? 'true' : undefined}
            onClick={() => onPick(i)}
          >
            {i === at && <i className="lap" ref={lap} style={{ background: car.colour }} />}
          </button>
        ))}
      </div>
      <div className="caption">
        <p className="on" key={at}>{`On track · ${pad(at + 1)} / ${CARS.length}`}</p>
        <p className="driver">{now.driver}</p>
        <p className="model">
          {now.team} {now.car}
        </p>
      </div>
      <div className="controls">
        <button type="button" aria-label="Previous car" onClick={() => onPick((at + CARS.length - 1) % CARS.length)}>
          Previous
        </button>
        <button type="button" aria-pressed={paused} onClick={onPause}>
          {paused ? 'Play' : 'Pause'}
        </button>
        <button type="button" aria-label="Next car" onClick={() => onPick((at + 1) % CARS.length)}>
          Next
        </button>
      </div>
    </div>
  )
}
