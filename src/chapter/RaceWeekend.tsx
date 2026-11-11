import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { PHOTOS } from '#/home/content.ts'
import { useSecond, useZone } from '#/motion/client.ts'
import { block, gsap, ONCE, onEnter, REDUCED, reveal, roll, ScrollTrigger, sweep, useGSAP } from '#/motion/motion.ts'
import { seasonQueryOptions, useSeason } from '#/season/use-season.ts'
import { Go } from '#/shell/Go.tsx'
import { waitFor } from '#/shell/Loader.tsx'

import { Days } from './Days.tsx'
import { chapterLive } from './page-model.ts'
import { Knockout, Ladder, PoleBand } from './Posters.tsx'
import { Next } from './Next.tsx'
import { Words } from './Words.tsx'
import { RACE_WEEKEND_WORDS } from './words.ts'

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.shot')) reveal(el)

  for (const el of all(scope, '.poster .headline .hl, .band .headline, .words h2')) sweep(el)

  for (const [i, el] of all(scope, '.days .col').entries()) block(el, { trigger: scope.querySelector('.days .cols') ?? el, delay: i * 0.06 })

  for (const el of all(scope, '.poster .num')) roll(el)

  for (const el of all(scope, '.ladder .rungs li:first-child .num')) block(el, { delay: 1.3 })

  if (REDUCED) return

  for (const el of all(scope, '.opening .intro, .poster .body')) gsap.from(el, { y: 24, opacity: 0, duration: 0.9, ease: 'brake', scrollTrigger: { trigger: el, start: 'top 90%', ...ONCE } })

  const days = scope.querySelector('.days')

  if (days) ScrollTrigger.create({ trigger: days, start: 'top 55%', end: 'bottom 45%', onToggle: (self) => document.documentElement.classList.toggle('flip', self.isActive) })
}

export function RaceWeekend() {
  const client = useQueryClient()
  const { data, isPending } = useSeason()
  const now = useSecond()
  const zone = useZone()
  const root = useRef<HTMLDivElement>(null)
  const live = data ? chapterLive(data, now, zone) : null

  useEffect(() => {
    waitFor(client.fetchQuery(seasonQueryOptions))
  }, [client])

  useGSAP(
    (_, safe) => {
      const scope = root.current

      if (!scope || isPending || !safe) return

      motion(scope)

      const off = onEnter(safe(() => hero(scope)))

      return () => {
        off()
        document.documentElement.classList.remove('flip')
      }
    },
    { dependencies: [isPending], scope: root },
  )

  const grid = PHOTOS.ch01
  const next = PHOTOS.ch02

  return (
    <div className="chapter-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono muted label">How F1 works · Chapter 01 · 5 min</p>
          <Go to="/chapters/overtaking" className="mono nav">
            02 How overtaking works →
          </Go>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">Three days.</span>
          <span className="hl">One race.</span>
        </h1>
        <p className="intro">Friday is practice, Saturday sets the order, Sunday pays the points.</p>
      </section>
      <figure className="photo-band">
        <div className="shot">
          <img src={grid.src} alt="McLaren, Mercedes and Aston Martin cars lined up on the grid in Shanghai." />
        </div>
        <figcaption className="caption">
          <p className="mono">{`01 · ${grid.place}`}</p>
          <p className="what">Norris, Hamilton and Alonso wait for the Sprint start.</p>
        </figcaption>
        <p className="mono muted credit">{grid.credit}</p>
      </figure>
      <Days key={live?.format ?? 'standard'} initial={live?.format ?? 'standard'} now={live?.weekend ?? null} />
      <Knockout lines={live?.knockout ?? { q1: null, q2: null, pole: null }} />
      {live?.circuit ? <PoleBand info={live.circuit} /> : null}
      <Ladder line={live?.ladder ?? null} />
      <Words keys={RACE_WEEKEND_WORDS} />
      <Next n="02" min={5} title="How overtaking works." line="Why a pass starts a lap early" photo={next} to="/chapters/overtaking" />
    </div>
  )
}
