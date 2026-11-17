import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { Next } from '#/chapter/Next.tsx'
import { useSecond } from '#/motion/client.ts'
import { block, onEnter, roll, sweep, useGSAP } from '#/motion/motion.ts'
import { seasonQueryOptions, useSeason } from '#/season/use-season.ts'
import { waitFor } from '#/shell/Loader.tsx'

import { indexCells, indexFacts, SEASON } from './index-model.ts'
import { NEXT_PEOPLE } from './pages.ts'
import { SizesBand } from './SizesBand.tsx'

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .label, .opening .hl').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })

  for (const el of all(scope, '.opening .count')) roll(el)
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.sizes .hl, .next h2')) sweep(el)

  for (const el of all(scope, '.sizes .stage')) block(el)
}

export function TracksIndex() {
  const client = useQueryClient()
  const { data } = useSeason()
  const now = useSecond()
  const root = useRef<HTMLDivElement>(null)

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

  const facts = indexFacts(data)
  const cells = indexCells(data, now)

  const columns = [
    ['Longest lap', facts.longest.label, `${facts.longest.km} km`],
    ['Shortest lap', facts.shortest.label, `${facts.shortest.km} km`],
    ['Newest', facts.newest.label, facts.newest.line],
  ] as const

  return (
    <div className="chapter-page tracks-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <p className="mono muted label">{`The tracks · ${SEASON} season`}</p>
        <h1 id="h1" className="display">
          <span className="count num">{facts.count}</span>
          <span className="lead">
            <span className="hl">tracks this</span>
            <span className="hl">season.</span>
          </span>
        </h1>
        <div className="side">
          <p className="intro">From Melbourne in March to Abu Dhabi in December: streets, parkland and purpose-built circuits, and no two ask the same of a car.</p>
          <dl className="facts">
            {columns.map(([label, name, line]) => (
              <div key={label}>
                <dt className="mono muted">{label}</dt>
                <dd>
                  <b>{name}</b>
                  <span className="mono muted">{line}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <SizesBand cells={cells} />
      <Next {...NEXT_PEOPLE} />
    </div>
  )
}
