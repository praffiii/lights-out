import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'

import { Next } from '#/chapter/Next.tsx'
import { onEnter, roll, sweep, useGSAP } from '#/motion/motion.ts'
import { seasonQueryOptions, useSeason } from '#/season/use-season.ts'
import { Go } from '#/shell/Go.tsx'
import { waitFor } from '#/shell/Loader.tsx'
import { opposite, useTheme } from '#/shell/theme.ts'

import { BAND, LEGENDS, NEXT_SEASON } from './legends.ts'
import { type PeopleIndex as Model, peopleIndex, type TowerRow } from './page-model.ts'

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .label, .opening .hl').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })

  for (const el of all(scope, '.opening .count')) roll(el)
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, 'section:not(.opening) h2 .hl, .next h2')) sweep(el)

  for (const el of all(scope, '.champion .num, .legends .count')) roll(el)
}

function Opening({ hero }: { hero: Model['hero'] }) {
  return (
    <section className="opening" aria-labelledby="h1">
      <p className="mono muted label">{hero.label}</p>
      <h1 id="h1" className="display">
        <span className="count num">{hero.count}</span>{' '}
        <span className="lead">
          <span className="hl">drivers on</span> <span className="hl">the grid.</span>
        </span>
      </h1>
      <div className="side">
        <p className="intro">{hero.body}</p>
        <dl className="facts">
          {hero.facts.map((fact) => (
            <div key={fact.label}>
              <dt className="mono muted">{fact.label}</dt>
              <dd>
                <b>{fact.value}</b>
                <span className="mono muted">{fact.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function Champion() {
  const { theme } = useTheme()

  return (
    <section className="champion" data-theme={opposite(theme ?? 'light')} aria-labelledby="champion">
      <div className="story">
        <p className="mono muted label">{BAND.label}</p>
        <h2 id="champion" className="display">
          {BAND.title.map((line) => (
            <span key={line} className="hl">
              {`${line} `}
            </span>
          ))}
        </h2>
        <p className="body">{BAND.body}</p>
        <dl className="stat">
          <dt className="mono muted">{BAND.stat.label}</dt>
          <dd>
            <span className="num">{BAND.stat.value}</span> <span className="unit">{BAND.stat.unit}</span>
          </dd>
        </dl>
        <p className="payoff">
          <span className="mono">So</span>
          <span>{BAND.payoff}</span>
        </p>
        <Go to={BAND.to} className="read">
          {BAND.read}
        </Go>
      </div>
      <figure>
        <div className="shot">
          <img src={BAND.photo.src} alt={BAND.caption} loading="lazy" />
        </div>
        <figcaption className="caption">
          <p className="mono">{BAND.photo.place}</p>
          <p className="name">{BAND.caption}</p>
        </figcaption>
        <p className="mono muted credit">{BAND.photo.credit}</p>
      </figure>
    </section>
  )
}

function Cells({ row }: { row: TowerRow }) {
  return (
    <>
      <span className="mono pos">{row.position}</span>
      <span className="mono no">{row.number}</span>
      <span className="name">{row.name}</span>
      <span className="mono team">{row.team}</span>
      <span className="mono nat">{row.champion ? 'Champion' : row.nationality}</span>
      <span className="pts">{row.points}</span>
    </>
  )
}

function Tower({ tower }: { tower: Model['tower'] }) {
  return (
    <section className="who" aria-labelledby="who">
      <div className="head">
        <p className="mono muted label">{tower.label}</p>
        <h2 id="who" className="display">
          <span className="hl">Who's who.</span>
        </h2>
        <p className="mono muted meta">{tower.meta}</p>
      </div>
      <div className="mono muted row tower-head" aria-hidden="true">
        <span>Pos</span>
        <span>No.</span>
        <span>Driver</span>
        <span>Team</span>
        <span>Nationality</span>
        <span>Points</span>
      </div>
      <ol className="tower">
        {tower.rows.map((row) => (
          <li key={row.name} className={row.champion ? 'is-champion' : undefined}>
            {row.to ? (
              <Go to={row.to} className="row" aria-label={row.name}>
                <Cells row={row} />
                <span className="mono read">Read →</span>
                {row.thumb ? (
                  <figure className="thumb">
                    <img src={row.thumb.src.replace(/\.jpg$/, '-phone.jpg')} alt="" loading="lazy" />
                    <figcaption className="mono muted credit">{`${row.thumb.place} · ${row.thumb.credit}`}</figcaption>
                  </figure>
                ) : null}
              </Go>
            ) : (
              <div className="row">
                <Cells row={row} />
              </div>
            )}
          </li>
        ))}
      </ol>
      {tower.footnote ? <p className="mono muted credit tower-note">{tower.footnote}</p> : null}
    </section>
  )
}

function Legends() {
  const [name = '', where = ''] = LEGENDS.photo.place.split(' · ')

  return (
    <section className="legends" aria-labelledby="legends">
      <div className="head">
        <p className="mono muted label">{LEGENDS.label}</p>
        <h2 id="legends" className="display">
          {LEGENDS.title.map((line) => (
            <span key={line} className="hl">
              {`${line} `}
            </span>
          ))}
        </h2>
      </div>
      <div className="titles">
        <p className="mono muted meta">{LEGENDS.meta}</p>
        <ol>
          {LEGENDS.rows.map((row) => (
            <li key={row.line}>
              <span className="count num">{row.titles}</span>
              <span className="line">{row.line}</span>
            </li>
          ))}
        </ol>
      </div>
      <figure>
        <div className="shot">
          <img src={LEGENDS.photo.src} alt={LEGENDS.photo.place} loading="lazy" />
        </div>
        <figcaption className="caption">
          <p className="mono">{where.replace(', ', ' · ')}</p>
          <p className="name">{name}</p>
        </figcaption>
        <p className="note">{LEGENDS.note}</p>
        <p className="mono muted credit">{LEGENDS.photo.credit}</p>
      </figure>
    </section>
  )
}

export function PeopleIndex() {
  const client = useQueryClient()
  const { data } = useSeason()
  const root = useRef<HTMLDivElement>(null)
  const index = useMemo(() => (data?.people ? peopleIndex(data, new Date(data.fetchedAt)) : null), [data])

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
    { scope: root, dependencies: [index !== null] },
  )

  if (!index) return <p className="people-empty">The season data is on its way. Try again in a minute.</p>

  return (
    <div className="chapter-page tracks-page track-page people-index" ref={root}>
      <Opening hero={index.hero} />
      {index.band.visible ? <Champion /> : null}
      <Tower tower={index.tower} />
      <Legends />
      <Next {...NEXT_SEASON} />
    </div>
  )
}
