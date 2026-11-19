import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Next } from '#/chapter/Next.tsx'
import { circuitFor } from '#/circuits/registry.ts'
import { seasonQueryOptions, useSeason } from '#/season/use-season.ts'
import { waitFor } from '#/shell/Loader.tsx'
import { CircuitStage } from '#/weekend/CircuitStage.tsx'

import { Career, Hero, Races, Season, usePageMotion } from './DriverPage.tsx'
import { storyPage } from './page-model.ts'
import { RUN } from './run.ts'
import { RunHud } from './RunHud.tsx'
import { HERO, MILESTONES, MONZA, NEXT_LEGENDS, NUMBERS, RECORD, W17 } from './story.ts'

const RECORD_SECTION = {
  ...RECORD,
  ladder: RECORD.ages.map((a) => ({ label: `${a.name} · ${a.season}`, value: `${a.years} y ${a.days} d` })),
}

const [w17Name = '', w17Where = ''] = W17.place.split(' · ')

function Monza() {
  const info = circuitFor('monza')
  const [near, setNear] = useState(false)
  const onNear = useCallback(() => setNear(true), [])

  if (!info) return null

  return (
    <>
      <section className="band lap-band monza-band" data-theme="dark" aria-labelledby="monza">
        <div className="head">
          <p className="mono label">{MONZA.label}</p>
          <h2 id="monza" className="display">
            <span className="hl">{MONZA.headline[0]}</span> <span className="hl">{MONZA.headline[1]}</span>
          </h2>
          <p className="body">{MONZA.body}</p>
        </div>
        <dl className="figures">
          {MONZA.stats.map((stat) => (
            <div key={stat.label}>
              <dt className="mono muted">{stat.label}</dt>
              <dd>
                <span className="num">{stat.value}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="circuit">
          <CircuitStage info={info} near={near} onNear={onNear} lap={null} places={MONZA.tags} bare controls hud={(ctx) => <RunHud run={RUN} {...ctx} />} />
        </div>
        <p className="explain">{MONZA.explain}</p>
      </section>
      <p className="mono muted credit lap-note">{MONZA.footnote}</p>
    </>
  )
}

export function StoryPage() {
  const client = useQueryClient()
  const { data } = useSeason()
  const root = useRef<HTMLDivElement>(null)
  const model = useMemo(() => (data ? storyPage(data, new Date(data.fetchedAt)) : null), [data])

  useEffect(() => {
    waitFor(client.fetchQuery(seasonQueryOptions))
  }, [client])

  usePageMotion(root, model !== null)

  return (
    <div className="chapter-page tracks-page track-page driver-page story-page" ref={root}>
      <Hero hero={{ ...HERO, label: model?.label ?? '' }} />
      {model ? <Season season={{ ...model.numbers, headline: NUMBERS.title, payoff: NUMBERS.payoff }} /> : null}
      <Career career={RECORD_SECTION} />
      <Monza />
      <figure className="photo-band w17">
        <div className="shot">
          <img src={W17.src} alt={W17.place} loading="lazy" />
        </div>
        <figcaption className="caption">
          <p className="mono muted">{w17Where.replace(', ', ' · ')}</p>
          <p className="what">{w17Name}</p>
        </figcaption>
        <p className="mono muted credit">{W17.credit}</p>
      </figure>
      <section className="history milestones" aria-labelledby="milestones">
        <div className="head">
          <p className="mono muted label">{MILESTONES.label}</p>
          <h2 id="milestones" className="display">
            <span className="hl">{MILESTONES.title[0]}</span> <span className="hl">{MILESTONES.title[1]}</span>
          </h2>
        </div>
        <ol className="years">
          {MILESTONES.rows.map((row) => (
            <li key={row.year}>
              <span className="year">{row.year}</span>
              <span className="line">{row.line}</span>
            </li>
          ))}
        </ol>
      </section>
      {model ? <Races races={model.races} /> : null}
      <Next {...NEXT_LEGENDS} />
    </div>
  )
}
