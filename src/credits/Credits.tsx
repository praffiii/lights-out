import { useRef } from 'react'

import { gsap, ONCE, onEnter, REDUCED, sweep, useGSAP } from '#/motion/motion.ts'

import type { Credit } from './photos.ts'
import { COUNTS, CREDITS } from './photos.ts'

const FIRST = 8

const FIGURES = [
  ['Photos', COUNTS.photos],
  ['Photographers', COUNTS.photographers],
  ['Official F1 images', 0],
] as const

const TYPEFACES = [
  ['Archivo', 'Display and text', 'Omnibus-Type · SIL Open Font License'],
  ['Martian Mono', 'Numbers and labels', 'Evil Martians · SIL Open Font License'],
] as const

const SOURCES = [
  ['Jolpica F1 API', 'Calendar, results and standings'],
  ['OpenF1', 'Lap times, telemetry and race control · unofficial'],
  ['bacinger/f1-circuits', 'Circuit layouts · MIT licence'],
  ['NASA SRTM', 'Circuit elevation · public domain'],
  ['OpenStreetMap', 'The map under every circuit · © contributors, ODbL'],
  ['MaG80', 'The 3D car · CC BY 4.0'],
  ['MultiViewer', 'Pit-loss estimates'],
] as const

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.headline .hl')) sweep(el)

  if (REDUCED) return

  for (const el of all(scope, '.figures, .made .note, .faces li, .print .text')) gsap.from(el, { y: 24, opacity: 0, duration: 0.8, ease: 'brake', scrollTrigger: { trigger: el, start: 'top 92%', ...ONCE } })
}

const titled = (place: string) => {
  const parts = place.split(' · ')
  const title = parts.find((part) => /, \d{4}$/.test(part)) ?? parts[0] ?? place

  return { title, note: parts.filter((part) => part !== title).join(' · ') }
}

function Row({ credit }: { credit: Credit }) {
  const { title, note } = titled(credit.place)

  return (
    <li>
      <span className="thumb">
        <img src={credit.src} alt="" loading="lazy" />
      </span>
      <span className="place">
        <b>{title}</b>
        <span className="mono muted">{note}</span>
      </span>
      <span className="by">{credit.by}</span>
      <span className="mono licence">{credit.licence}</span>
      <span className="muted used">{credit.usedOn}</span>
      {credit.source ? (
        <a className="mono go" href={credit.source} rel="noreferrer">
          Commons →
        </a>
      ) : null}
    </li>
  )
}

export function Credits() {
  const root = useRef<HTMLDivElement>(null)

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
    <div className="chapter-page credits-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono muted label">Credits</p>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">Built on other</span>
          <span className="hl">people's work.</span>
        </h1>
      </section>
      <div className="figures">
        <dl>
          {FIGURES.map(([label, n]) => (
            <div key={label}>
              <dt className="mono muted">{label}</dt>
              <dd>
                <b>{n}</b>
              </dd>
            </div>
          ))}
        </dl>
        <p className="muted">Every photo comes from Wikimedia Commons, under the licence its photographer chose. Each one is credited here and again on the page where it appears.</p>
      </div>
      <section className="photos" aria-label="Every photo">
        <div className="mono muted cols" aria-hidden>
          <span>Photo</span>
          <span>Place and year</span>
          <span>Photographer</span>
          <span>Licence</span>
          <span>Used on</span>
          <span>Source</span>
        </div>
        <ul>
          {CREDITS.slice(0, FIRST).map((credit) => (
            <Row key={credit.src} credit={credit} />
          ))}
        </ul>
        <details>
          <summary>{`Show all ${COUNTS.photos} photos ↓`}</summary>
          <ul>
            {CREDITS.slice(FIRST).map((credit) => (
              <Row key={credit.src} credit={credit} />
            ))}
          </ul>
        </details>
      </section>
      <section className="made" data-theme="dark" aria-labelledby="made">
        <div className="head">
          <p className="mono label">Type and data</p>
          <h2 id="made" className="headline">
            <span className="hl">Two typefaces.</span>
            <span className="hl">Seven sources.</span>
          </h2>
          <p className="note">All free and open. The site runs at no cost, and none of these ask for a key.</p>
        </div>
        <ul className="faces">
          {TYPEFACES.map(([name, use, by]) => (
            <li key={name}>
              <b className={name === 'Martian Mono' ? 'mono' : undefined}>{name}</b>
              <p>
                <span className="mono">{use}</span>
                {by}
              </p>
            </li>
          ))}
        </ul>
        <ol className="sources">
          {SOURCES.map(([name, what], i) => (
            <li key={name}>
              <span className="mono">{`Source ${String(i + 1).padStart(2, '0')}`}</span>
              <b>{name}</b>
              <p>{what}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="print" aria-labelledby="print">
        <div>
          <p className="mono muted label">The small print</p>
          <h2 id="print" className="headline">
            <span className="hl">Not affiliated</span>
            <span className="hl">with Formula 1.</span>
          </h2>
        </div>
        <div className="text">
          <p className="muted">Lights Out is an unofficial fan project, made for fun and run at no cost. F1, FORMULA ONE, FORMULA 1 and related marks are trademarks of Formula One Licensing B.V., used here only to name the sport.</p>
          <a className="mono" href="https://github.com/praffiii/lights-out/issues/new" rel="noreferrer">
            Spot a wrong credit? Open an issue →
          </a>
        </div>
      </section>
    </div>
  )
}
