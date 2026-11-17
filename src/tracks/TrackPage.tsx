import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { Next } from '#/chapter/Next.tsx'
import { MODELLED, type ModelledId } from '#/circuits/modelled.ts'
import { circuitFor, type CircuitInfo } from '#/circuits/registry.ts'
import type { Photo } from '#/home/content.ts'
import { useSecond } from '#/motion/client.ts'
import { onEnter, roll, sweep, useGSAP } from '#/motion/motion.ts'
import { usePoleLap } from '#/pole/use-pole-lap.ts'
import { seasonQueryOptions, useSeason } from '#/season/use-season.ts'
import { capital } from '#/season/words.ts'
import { Go } from '#/shell/Go.tsx'
import { waitFor } from '#/shell/Loader.tsx'
import { CircuitStage, TELEMETRY } from '#/weekend/CircuitStage.tsx'

import { Braking } from './Braking.tsx'
import { braking } from './braking.ts'
import { heroLabel, liveRow, turnsWord } from './page-model.ts'
import { NEXT_PEOPLE, TRACK_PAGES, type TrackPage as Page } from './pages.ts'

const FOOTNOTE = 'Layout: bacinger/f1-circuits (MIT) · elevation: SRTM 30 m (NASA), exaggerated 1.5x · Map © OpenStreetMap contributors (ODbL) · turn numbers: F1 circuit map'

const SECTORS = 'Three timed sectors: S1 purple, S2 green, S3 yellow.'

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.top .label, .top h1').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, 'section:not(.top, .braking) .hl, .next h2')) sweep(el)

  for (const el of all(scope, '.band .figures .num')) roll(el)
}

const captionOf = (place: string) => {
  const [name = place, where = ''] = place.split(' · ')

  return { name, label: where.replace(', ', ' · ') }
}

function Shot({ photo, eager }: { photo: Photo; eager?: true }) {
  return (
    <div className="shot">
      <picture>
        <source media="(max-width: 760px)" srcSet={photo.src.replace(/\.jpg$/, '-phone.jpg')} />
        <img src={photo.src} alt={photo.place} loading={eager ? undefined : 'lazy'} fetchPriority={eager ? 'high' : undefined} />
      </picture>
    </div>
  )
}

function Card({ photo }: { photo: Photo }) {
  const { name, label } = captionOf(photo.place)

  return (
    <>
      <Shot photo={photo} />
      <figcaption className="caption">
        <p className="mono muted">{label}</p>
        <p className="name">{name}</p>
      </figcaption>
    </>
  )
}

function Headline({ id, lines }: { id: string; lines: readonly [string, string] }) {
  return (
    <h2 id={id} className="display">
      <span className="hl">{lines[0]}</span> <span className="hl">{lines[1]}</span>
    </h2>
  )
}

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div>
      <dt className="mono muted">{label}</dt>
      <dd>
        <span className="num">{value}</span>
        {unit ? <span className="unit">{unit}</span> : null}
      </dd>
    </div>
  )
}

function Track({ id, info, page }: { id: ModelledId; info: CircuitInfo; page: Page }) {
  const client = useQueryClient()
  const { data } = useSeason()
  const now = useSecond()
  const root = useRef<HTMLDivElement>(null)
  const lap = usePoleLap(info.id, true)
  const numbers = lap ? braking(lap, info.laps) : null
  const live = liveRow(id, data, now)
  const { facts } = info

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
    { scope: root },
  )

  const run = numbers?.longestRun
  const explain = run ? `${SECTORS} The longest run without braking: ${Math.round(run.seconds)} seconds, from Turn ${run.from} to Turn ${run.to}.` : SECTORS

  return (
    <div className="chapter-page tracks-page track-page" ref={root}>
      <section className="top" aria-labelledby="h1">
        <Shot photo={page.hero} eager />
        <div className="title">
          <p className="mono muted label">{heroLabel(id, page, data)}</p>
          <h1 id="h1" className="display">{`${info.name}.`}</h1>
          <p className="intro">{page.intro}</p>
        </div>
        <p className="mono credit">{`${page.hero.place} · ${page.hero.credit}`}</p>
      </section>
      <section className="band lap-band" data-theme="dark" aria-labelledby="lap">
        <div className="head">
          <p className="mono label">Read the lap</p>
          <Headline id="lap" lines={page.bandTitle} />
        </div>
        <dl className="figures">
          <Stat label="First race here" value={facts.firstGp} />
          <Stat label="Lap" value={facts.lengthKm} unit="km" />
          <Stat label="Race laps" value={facts.laps} />
          <Stat label="Race distance" value={facts.distanceKm} unit="km" />
        </dl>
        <div className="circuit">
          <CircuitStage info={info} near lap={lap} places={page.places} />
        </div>
        <p className="explain">{explain}</p>
      </section>
      <p className="mono muted credit lap-note">{lap ? FOOTNOTE + TELEMETRY : FOOTNOTE}</p>
      <section className="corners" aria-labelledby="corners">
        <div className="head">
          <p className="mono muted label">Corners</p>
          <h2 id="corners" className="display">
            <span className="hl">{turnsWord(facts.turns)}</span> <span className="hl">turns.</span>
          </h2>
          <p className="body">{`${capital(facts.direction)}, ${page.cornersBody}`}</p>
        </div>
        {page.corners.map((corner) => (
          <figure key={corner.tag} className="corner">
            <Card photo={corner.photo} />
            <p className="mono tag">{corner.tag}</p>
            <p className="line">{corner.line}</p>
            <p className="mono muted credit">{corner.photo.credit}</p>
          </figure>
        ))}
      </section>
      {lap && numbers ? <Braking numbers={numbers} lap={lap} info={info} /> : null}
      <section className="history" aria-labelledby="history">
        <div className="head">
          <p className="mono muted label">History</p>
          <Headline id="history" lines={page.historyTitle} />
        </div>
        <figure className="then">
          <Card photo={page.historyPhoto} />
          <p className="mono muted credit">{`${page.historyPhoto.credit}, via Wikimedia Commons`}</p>
        </figure>
        <ol className="years">
          {page.history.map((row) => (
            <li key={row.year}>
              <span className="year">{row.year}</span>
              <span className="line">{row.line}</span>
            </li>
          ))}
          {live ? (
            <li className="live">
              <span className="year">{live.year}</span>
              <span className="line">{live.line}</span>
            </li>
          ) : null}
        </ol>
      </section>
      <Next {...NEXT_PEOPLE} />
    </div>
  )
}

export function Missing() {
  return (
    <section className="tracks-missing">
      <h1 className="mono">No page for this track yet</h1>
      <Go to="/tracks" className="mono">
        All the tracks
      </Go>
    </section>
  )
}

export const trackFor = (circuit: string) => {
  const id = MODELLED.find((m) => m === circuit)
  const page = id ? TRACK_PAGES[id] : undefined
  const info = circuitFor(circuit)

  return id && page && info ? { id, info, page } : null
}

export function TrackPage({ circuit }: { circuit: string }) {
  const track = trackFor(circuit)

  return track ? <Track {...track} /> : <Missing />
}
