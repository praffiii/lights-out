import { useMemo, useRef } from 'react'

import { PHOTOS } from '#/home/content.ts'
import { block, gsap, ONCE, onEnter, REDUCED, reveal, roll, sweep, useGSAP } from '#/motion/motion.ts'
import { useSeason } from '#/season/use-season.ts'
import { Go } from '#/shell/Go.tsx'
import { sum } from '#/titles/copy.ts'
import type { Titles } from '#/titles/schema.ts'
import { FALLBACK, pickTitles } from '#/titles/titles.ts'

import { POINTS } from './content.ts'
import { Next } from './Next.tsx'
import { SeasonRace } from './SeasonRace.tsx'
import { Term } from './Term.tsx'
import { Words } from './Words.tsx'
import { TITLES_WORDS } from './words.ts'

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

const rise = (el: HTMLElement, start: string) => gsap.from(el, { y: 24, opacity: 0, duration: 0.8, ease: 'brake', clearProps: 'transform', scrollTrigger: { trigger: el, start, ...ONCE } })

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.shot')) reveal(el)

  for (const el of all(scope, '.scores .headline, .season-race .headline .hl, .sum .headline .hl, .words h2')) sweep(el)

  for (const el of all(scope, '.cap .payoff')) block(el, { delay: 0.3 })

  for (const el of all(scope, '.scores .num, .sum .num')) roll(el)

  if (REDUCED) return

  for (const el of all(scope, '.opening .intro, .scores .body, .sum .body, .cap .body')) rise(el, 'top 90%')

  for (const el of all(scope, '.scores .extra li, .cap .num, .cap .unit')) rise(el, 'top 92%')
}

function Scores({ titles }: { titles: Titles }) {
  const sprints = [...titles.rounds, ...titles.left].filter((round) => round.sprint).length

  return (
    <section className="scores" aria-labelledby="scores">
      <p className="mono label">The points</p>
      <h2 id="scores" className="display headline">
        Top ten score.
      </h2>
      <p className="body">Finish in the top ten on Sunday and you score. A win is worth 25, tenth place 1. Every point goes into two tables at once: the driver&apos;s and the team&apos;s.</p>
      <ol className="steps">
        {POINTS.map((points, i) => (
          <li key={points}>
            <p className="display num">{points}</p>
            <p className="mono muted">{`P${i + 1}`}</p>
          </li>
        ))}
      </ol>
      <ul className="extra">
        <li>
          <p className="mono muted">
            <Term k="sprint">Sprint</Term>
          </p>
          <p className="what">8 to 1 for the top eight.</p>
          <p className="mono tag">{`${sprints} weekends in ${titles.season}`}</p>
        </li>
        <li>
          <p className="mono muted">Fastest lap</p>
          <p className="what">No bonus point since 2025.</p>
          <p className="mono tag">Worth 1 from 2019 to 2024</p>
        </li>
      </ul>
      <p className="mono muted credit">FIA F1 Regulations 2026, Section A, issue 02, A2.2 · Sprint weekends: Jolpica F1 API</p>
    </section>
  )
}

function Sum({ titles }: { titles: Titles }) {
  const s = sum(titles)

  return (
    <section className="sum" aria-labelledby="sum">
      <p className="mono label">{s.label}</p>
      <ul className="terms">
        {s.terms.map((term, i) => (
          <li key={term.caption}>
            {i > 0 ? (
              <span className="display op" aria-hidden>
                +
              </span>
            ) : null}
            <p className="display num" key={term.points}>
              {term.points}
            </p>
            <p className="mono muted">{term.caption}</p>
          </li>
        ))}
        <li className="total">
          <span className="display op" aria-hidden>
            =
          </span>
          <p className="display num" key={s.total.points}>
            {s.total.points}
          </p>
          <p className="mono">{s.total.caption}</p>
        </li>
      </ul>
      <div className="told">
        <h2 id="sum" className="display headline">
          {s.headline.map((line) => (
            <span key={line} className="hl">
              {line}
            </span>
          ))}
        </h2>
        <p className="body">{s.body}</p>
      </div>
      <p className="mono muted credit">{s.source}</p>
    </section>
  )
}

function Cap() {
  const photo = PHOTOS.ch08Cadillac

  return (
    <section className="cap" aria-labelledby="cap">
      <div className="money">
        <p className="mono label">The budget cap</p>
        <h2 id="cap">
          <span className="display num">$215m</span>
          <span className="unit">a year, per team, from 2026</span>
        </h2>
        <p className="body">
          The most a team may spend in a season on designing, building and running its cars. The old base was $135 million, but more costs now count. Driver pay, the three best-paid staff and marketing sit outside the{' '}
          <Term k="budgetCap">cap</Term>.
        </p>
      </div>
      <figure>
        <div className="shot">
          <img src={photo.src} alt="Sergio Pérez in the black and white Cadillac at Melbourne." loading="lazy" />
        </div>
        <figcaption className="caption">
          <p className="mono">{`02 · ${photo.place}`}</p>
          <p className="what">Cadillac, the new eleventh team, spends to the same cap.</p>
        </figcaption>
        <p className="mono muted credit">{`${photo.credit}, via Wikimedia Commons`}</p>
      </figure>
      <div className="payoff">
        <p className="mono">Over the cap</p>
        <p className="what">
          Red Bull, 2021: £1.86m over. A $7m fine and 10% less <Term k="windTunnel">wind tunnel</Term> time for a year.
        </p>
        <p className="mono">Minor breach</p>
      </div>
      <p className="mono muted credit">FIA F1 Regulations 2026, Section D, issue 07, D4.1 and D5.1 · FIA summary, Red Bull accepted breach agreement, 2022 · £0.43m over with a tax credit applied</p>
    </section>
  )
}

export function Championships() {
  const root = useRef<HTMLDivElement>(null)
  const { data } = useSeason()
  const titles = useMemo(() => pickTitles(data?.titles, FALLBACK), [data?.titles])
  const photo = PHOTOS.ch07Podium

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
    <div className="chapter-page championships-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono muted label">How F1 works · Chapter 08 · 6 min</p>
          <nav className="mono nav" aria-label="Chapters">
            <Go to="/chapters/defending">← 07 Defending</Go>
            <span aria-hidden> · </span>
            <Go to="/chapters/drs">09 DRS, 2011 to 2025 →</Go>
          </nav>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">Two titles.</span>
          <span className="hl">One set of points.</span>
        </h1>
        <p className="intro">Every point a driver scores counts twice: once for them, once for their team. One title goes to a person, the other to a team.</p>
      </section>
      <figure className="photo-band">
        <div className="shot">
          <img src={photo.src} alt="George Russell on the top step at Melbourne, with Kimi Antonelli and Charles Leclerc beside him." />
        </div>
        <figcaption className="caption">
          <p className="mono">01 · Podium · Melbourne, 2026</p>
          <p className="what">Russell first, Antonelli second: 43 points for Mercedes.</p>
        </figcaption>
        <p className="mono muted credit">{`${photo.credit}, via Wikimedia Commons`}</p>
      </figure>
      <Scores titles={titles} />
      <SeasonRace titles={titles} />
      <Sum titles={titles} />
      <Cap />
      <Words keys={TITLES_WORDS} />
      <Next label="Next · Chapter 09 · 5 min" title="DRS, 2011 to 2025." line="The flap that made passing easy" photo={PHOTOS.ch08Drs} to="/chapters/drs" />
    </div>
  )
}
