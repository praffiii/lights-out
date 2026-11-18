import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'

import { Next } from '#/chapter/Next.tsx'
import { onEnter, roll, sweep, useGSAP } from '#/motion/motion.ts'
import { seasonQueryOptions, useSeason } from '#/season/use-season.ts'
import { Go } from '#/shell/Go.tsx'
import { waitFor } from '#/shell/Loader.tsx'
import { opposite, useTheme } from '#/shell/theme.ts'

import { type DriverPage as Model, driverPage } from './page-model.ts'
import { personFor } from './people.ts'

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.top .label, .top h1 .hl').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, 'section:not(.top) h2 .hl, .next h2')) sweep(el)

  for (const el of all(scope, '.stats .num, .career .starts')) roll(el)
}

function Hero({ hero }: { hero: Model['hero'] }) {
  const { photo } = hero
  const [name = '', where = ''] = photo.place.split(' · ')

  return (
    <section className="top" aria-labelledby="h1">
      <div className="shot">
        <picture>
          <source media="(max-width: 760px)" srcSet={photo.src.replace(/\.jpg$/, '-phone.jpg')} />
          <img src={photo.src} alt={photo.place} fetchPriority="high" />
        </picture>
      </div>
      <div className="title">
        <p className="mono muted label">{hero.label}</p>
        <h1 id="h1" className="display">
          <span className="hl">{hero.given}</span> <span className="hl">{`${hero.family}.`}</span>
        </h1>
        <p className="intro">{hero.sub}</p>
      </div>
      <div className="caption">
        <p className="mono">{where.replace(', ', ' · ')}</p>
        <p className="name">{name}</p>
      </div>
      <p className="mono credit">
        <span className="place">{`${photo.place} · `}</span>
        {photo.credit}
      </p>
    </section>
  )
}

function Season({ season }: { season: NonNullable<Model['season']> }) {
  return (
    <section className="season-numbers" aria-labelledby="season">
      <div className="head">
        <p className="mono muted label">{season.label}</p>
        <h2 id="season" className="display">
          <span className="hl">{season.headline}</span>
        </h2>
        <p className="body">{season.body}</p>
      </div>
      <dl className="stats">
        {season.stats.map((stat) => (
          <div key={stat.label}>
            <dt className="mono muted">{stat.label}</dt>
            <dd>
              <span className="num">{stat.value}</span>
              <span className="note">{stat.note}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="payoff">
        <span className="mono">So</span>
        <span>{season.payoff}</span>
      </p>
      <p className="mono muted credit">{season.credit}</p>
    </section>
  )
}

function Career({ career }: { career: NonNullable<Model['career']> }) {
  return (
    <section className="career" aria-labelledby="career">
      <p className="mono muted label">{career.label}</p>
      <p className="count">
        <span className="starts">{career.number}</span>
        <span className="unit">{career.unit}</span>
      </p>
      <div className="story">
        <h2 id="career" className="display">
          <span className="hl">{career.headline}</span>
        </h2>
        <p className="body">{career.body}</p>
        <p className="payoff-line">{career.payoff}</p>
      </div>
      <dl className="record">
        {career.ladder.map((line) => (
          <div key={line.label}>
            <dt className="mono">{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mono muted credit">{career.credit}</p>
    </section>
  )
}

function Races({ races }: { races: NonNullable<Model['races']> }) {
  const { theme } = useTheme()

  return (
    <>
      <section className="races" data-theme={opposite(theme ?? 'light')} aria-labelledby="races">
        <div className="head">
          <p className="mono muted label">{races.label}</p>
          <h2 id="races" className="display">
            <span className="hl">Race</span> <span className="hl">by race.</span>
          </h2>
          <p className="body">Where each race started and finished. The best result is filled purple.</p>
        </div>
        <table>
          <thead className="mono muted">
            <tr>
              <th scope="col">Rd</th>
              <th scope="col">Grand Prix</th>
              <th scope="col" className="city">
                City
              </th>
              <th scope="col">Start</th>
              <th scope="col">Finish</th>
              <th scope="col" className="pts">
                <span className="full">Points</span>
                <span className="short">Pts</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {races.rows.map((row) => (
              <tr key={row.round} className={row.best ? 'is-best' : row.dnr ? 'is-dnr' : undefined}>
                <td className="mono rd">{row.round}</td>
                <td className="gp">{row.grandPrix}</td>
                <td className="mono city">{row.city}</td>
                {row.start === null ? (
                  <td className="mono dnr" colSpan={3}>
                    {row.finish}
                  </td>
                ) : (
                  <>
                    <td className="start">{row.start}</td>
                    <td className="finish">
                      <span className="full">{row.finish}</span>
                      <span className="short">{row.short}</span>
                    </td>
                    <td className={row.points === '0' ? 'pts is-zero' : 'pts'}>{row.points}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="mono muted credit races-note">
        {races.footnote}
        {races.key ? <span className="key">{` ${races.key}`}</span> : null}
      </p>
    </>
  )
}

function Driver({ driverId }: { driverId: string }) {
  const client = useQueryClient()
  const { data } = useSeason()
  const root = useRef<HTMLDivElement>(null)
  const page = useMemo(() => (data ? driverPage(data, driverId, new Date(data.fetchedAt)) : null), [data, driverId])

  useEffect(() => {
    waitFor(client.fetchQuery(seasonQueryOptions))
  }, [client])

  useGSAP(
    (_, safe) => {
      const scope = root.current

      if (!scope || !safe) return

      motion(scope)

      return onEnter(safe(() => hero(scope)))
    },
    { scope: root, dependencies: [page !== null] },
  )

  if (!data?.people) return <p className="people-empty">The season data is on its way. Try again in a minute.</p>

  if (!page) return <Missing />

  return (
    <div className="chapter-page tracks-page track-page driver-page" ref={root}>
      <Hero hero={page.hero} />
      {page.season ? <Season season={page.season} /> : null}
      {page.career ? <Career career={page.career} /> : null}
      {page.races ? <Races races={page.races} /> : null}
      {page.next.photo ? <Next label={page.next.label} title={`${page.next.name}.`} line="Read " photo={page.next.photo} to={page.next.to} /> : null}
    </div>
  )
}

function Missing() {
  return (
    <section className="people-missing">
      <h1 className="mono">No page for this driver yet</h1>
      <Go to="/people" className="mono">
        All the people
      </Go>
    </section>
  )
}

export function DriverPage({ driverId }: { driverId: string }) {
  return personFor(driverId) ? <Driver driverId={driverId} /> : <Missing />
}
