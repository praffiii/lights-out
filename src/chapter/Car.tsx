import { type CSSProperties, useRef } from 'react'

import { rig } from '#/car/parts.ts'
import { PHOTOS, type Photo } from '#/home/content.ts'
import { gsap, ONCE, onEnter, REDUCED, reveal, sweep, useGSAP } from '#/motion/motion.ts'
import { Go } from '#/shell/Go.tsx'
import { useTheme } from '#/shell/theme.ts'

import { CarParts } from './CarParts.tsx'
import { CarWings } from './CarWings.tsx'
import { Next } from './Next.tsx'
import { Words } from './Words.tsx'
import { CAR_WORDS } from './words.ts'

const SHRINK = [
  { what: 'Wheelbase', was: 3600, now: 3400, unit: 'mm' },
  { what: 'Minimum mass', was: 800, now: 768, unit: 'kg' },
  { what: 'Front tyre', was: 305, now: 280, unit: 'mm' },
  { what: 'Rear tyre', was: 405, now: 375, unit: 'mm' },
] as const

const ERAS = [
  { photo: PHOTOS.ch05History1950, what: 'Engine in front. No wings.', alt: 'Front-engined racing cars round a sandy corner at Zandvoort in 1950, a crowd on the dunes behind.' },
  { photo: PHOTOS.ch05History1978, what: 'The floor becomes a wing.', alt: 'Mario Andretti leads Ronnie Peterson through a corner at Zandvoort in 1978, both in black Lotus 79s.' },
  { photo: PHOTOS.ch05History2026, what: 'The wings move.', alt: "Kimi Antonelli's Mercedes W17 approaches Spoon Curve at Suzuka in 2026." },
] as const satisfies ReadonlyArray<{ photo: Photo; what: string; alt: string }>

const NUM = new Intl.NumberFormat('en-GB')

const pct = (v: number) => `${(v * 100).toFixed(2)}%`

type Dims = CSSProperties & Record<'--front' | '--rear' | '--left' | '--right', string>

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

const rise = (el: HTMLElement, y: number, start: string) => gsap.from(el, { y, opacity: 0, duration: 0.8, ease: 'brake', scrollTrigger: { trigger: el, start, ...ONCE } })

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.shot')) reveal(el)

  for (const el of all(scope, '.apart .headline .hl, .wings .headline .hl, .history .headline .hl, .words h2')) sweep(el)

  if (REDUCED) return

  for (const el of all(scope, '.opening .intro, .size .aside, .wings .body, .wings .speed, .payoff')) rise(el, 24, 'top 90%')

  for (const el of all(scope, '.shrink tbody tr, .history figure')) rise(el, 24, 'top 92%')
}

function Size() {
  const theme = useTheme().theme ?? 'light'
  const [front, rear] = rig.top.along
  const [left, right] = rig.top.across
  const dims: Dims = { '--front': pct(front), '--rear': pct(rear), '--left': pct(left), '--right': pct(right) }

  return (
    <section className="size" aria-labelledby="size">
      <p className="mono label">Smaller for 2026</p>
      <div className="big">
        <h2 id="size">
          <span className="display num">1,900</span>
          <span className="unit">mm wide</span>
        </h2>
        <p className="aside">
          <span>100 mm narrower than 2025.</span> <span>Shorter and lighter too.</span>
        </p>
      </div>
      <figure className="plan" style={dims}>
        <picture>
          <source media="(max-width: 760px)" srcSet={`/car/top-phone-${theme}.webp`} />
          <img src={`/car/top-${theme}.webp`} alt="The 2026 car from above." loading="lazy" />
        </picture>
        <span className="dim along" aria-hidden>
          <span className="mono">3,400 mm</span>
        </span>
        <span className="dim across" aria-hidden>
          <span className="mono">1,900 mm</span>
        </span>
      </figure>
      <table className="shrink">
        <thead>
          <tr className="mono">
            <th scope="col">
              <span className="sr">Measure</span>
            </th>
            <th scope="col" className="was">
              2025
            </th>
            <th scope="col" className="now">
              2026
            </th>
            <th scope="col" className="change">
              Change
            </th>
          </tr>
        </thead>
        <tbody>
          {SHRINK.map((row) => (
            <tr key={row.what}>
              <th scope="row" className="mono">
                {row.what}
              </th>
              <td className="was">{`${NUM.format(row.was)} ${row.unit}`}</td>
              <td className="now">{`${NUM.format(row.now)} ${row.unit}`}</td>
              <td className="mono change">
                {`−${NUM.format(row.was - row.now)}`}
                <span className="full">{` ${row.unit}`}</span>
                <span className="short">{` · was ${NUM.format(row.was)}`}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function History() {
  return (
    <section className="history" aria-labelledby="history">
      <p className="mono label">History</p>
      <h2 id="history" className="display headline">
        <span className="hl">Every era found</span>
        <span className="hl">grip somewhere new.</span>
      </h2>
      <div className="eras">
        {ERAS.map((era) => (
          <figure key={era.photo.src}>
            <p className="mono place">{era.photo.place}</p>
            <div className="shot">
              <img src={era.photo.src} alt={era.alt} loading="lazy" />
            </div>
            <figcaption className="what">{era.what}</figcaption>
            <p className="mono muted credit">{era.photo.credit}</p>
          </figure>
        ))}
      </div>
    </section>
  )
}

export function Car() {
  const root = useRef<HTMLDivElement>(null)
  const photo = PHOTOS.ch05

  useGSAP(
    (_, safe) => {
      const scope = root.current

      if (!scope || !safe) return

      motion(scope)

      return onEnter(safe(() => hero(scope)))
    },
    { scope: root },
  )

  return (
    <div className="chapter-page car-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono muted label">How F1 works · Chapter 05 · 8 min</p>
          <nav className="mono nav" aria-label="Chapters">
            <Go to="/chapters/flags">← 04 Flags and what they mean</Go>
            <span aria-hidden> · </span>
            <Go to="/chapters/power-unit">06 The power unit →</Go>
          </nav>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">Eight parts.</span>
          <span className="hl">One car.</span>
        </h1>
        <p className="intro">Every car on the 2026 grid is built from the same eight parts. Take one apart and each part has one job.</p>
      </section>
      <figure className="photo-band">
        <div className="shot">
          <img src={photo.src} alt="Oscar Piastri's McLaren MCL40 on track at Suzuka in 2026." />
        </div>
        <figcaption className="caption">
          <p className="mono">
            <span className="full">{`01 · ${photo.place}`}</span>
            <span className="short">01 · McLaren MCL40 · Suzuka, 2026</span>
          </p>
          <p className="what">Eleven teams, one rulebook, the same eight parts.</p>
        </figcaption>
        <p className="mono muted credit">{`${photo.credit}, via Wikimedia Commons`}</p>
      </figure>
      <CarParts />
      <Size />
      <CarWings />
      <History />
      <Words keys={CAR_WORDS} />
      <Next label="Next · Chapter 06 · 6 min" title="The power unit." line="Half fuel, half battery, one real pole lap" photo={PHOTOS.ch06} to="/chapters/power-unit" />
    </div>
  )
}
