import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { block, gsap, ONCE, REDUCED, reveal, roll, sweep, useGSAP } from '#/motion/motion.ts'
import { seasonQueryOptions, useSeason } from '#/season/use-season.ts'
import { waitFor } from '#/shell/Loader.tsx'

import { Calendar } from './Calendar.tsx'
import { Constructors } from './Constructors.tsx'
import { Drivers } from './Drivers.tsx'
import { ThisWeekend } from './ThisWeekend.tsx'
import { TitleFight } from './TitleFight.tsx'
import { WhoLed } from './WhoLed.tsx'

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

const rowOf = (els: HTMLElement[]) => {
  const tops = [...new Set(els.map((el) => el.offsetTop))].sort((a, b) => a - b)

  return els.map((el) => tops.indexOf(el.offsetTop))
}

const hairs = (rows: HTMLElement[], trigger: Element | null) => {
  if (trigger) gsap.from(rows, { '--hair': 0, duration: 1.2, ease: 'launch', stagger: 0.04, scrollTrigger: { trigger, start: 'top 85%', ...ONCE } })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, 'h2.display, .calendar .head p:last-child')) sweep(el)

  for (const el of all(scope, '.fighter .frame, .podium .frame, .this-weekend .band')) reveal(el, { drift: false })

  for (const el of all(scope, '.podium .pts, .tower .pts > span, .team-row b')) roll(el)

  for (const el of all(scope, '.podium .is-p1 .family, .team-row:first-child .team')) block(el, { delay: 1.3 })

  const strip = scope.querySelector('.who-led .lead-strip')
  const current = scope.querySelector<HTMLElement>('.who-led .is-current figcaption')

  if (strip && current) block(current, { trigger: strip, start: 'top 30%' })

  if (REDUCED) return

  const tiles = all(scope, '.tiles .tile')
  const rows = rowOf(tiles)
  const grid = scope.querySelector('.tiles')
  const now = scope.querySelector('.tile.is-now button')

  if (grid) {
    const trigger = { trigger: grid, start: 'top 85%', ...ONCE }

    gsap.from(tiles, { opacity: 0, y: 24, duration: 0.6, stagger: (i: number) => (rows[i] ?? 0) * 0.03, scrollTrigger: trigger })

    if (now) gsap.from(now, { '--rule': 0, duration: 0.8, ease: 'launch', delay: Math.max(0, ...rows) * 0.03 + 0.3, scrollTrigger: trigger })
  }

  hairs(all(scope, '.tower tbody tr'), scope.querySelector('.tower'))
  hairs(all(scope, '.team-row'), scope.querySelector('.teams'))

  if (strip)
    gsap.fromTo(
      strip,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: strip, start: 'top 85%', end: 'top 30%', scrub: true } },
    )
}

export function Season() {
  const client = useQueryClient()
  const { data } = useSeason()
  const root = useRef<HTMLDivElement>(null)
  const ready = data !== undefined

  useGSAP(
    () => {
      if (root.current && ready) motion(root.current)
    },
    { dependencies: [ready], scope: root },
  )

  useEffect(() => {
    waitFor(client.fetchQuery(seasonQueryOptions))
  }, [client])

  if (!data) {
    return (
      <div className="season">
        <p className="season-empty">The season data is on its way. Try again in a minute.</p>
      </div>
    )
  }

  return (
    <div className="season" ref={root}>
      <TitleFight snapshot={data} />
      <Calendar snapshot={data} />
      <Drivers snapshot={data} />
      <Constructors snapshot={data} />
      <WhoLed snapshot={data} />
      <ThisWeekend snapshot={data} />
    </div>
  )
}
