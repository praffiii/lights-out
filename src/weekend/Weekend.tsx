import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { useSecond, useZone } from '#/motion/client.ts'
import { block, gsap, ONCE, onEnter, REDUCED, reveal, roll, sweep, useGSAP } from '#/motion/motion.ts'
import { seasonQueryOptions, useSeason } from '#/season/use-season.ts'
import { waitFor } from '#/shell/Loader.tsx'
import { opposite, useTheme } from '#/shell/theme.ts'

import { CircuitBand } from './CircuitBand.tsx'
import { Clock } from './Clock.tsx'
import { Latest } from './Latest.tsx'
import { weekendPage } from './page-model.ts'
import { Teaser } from './Teaser.tsx'
import { Top } from './Top.tsx'

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

function hero(scope: HTMLElement) {
  const top = scope.querySelector<HTMLElement>('.top')

  if (top) reveal(top, { scroll: false, drift: false })

  for (const [i, el] of all(scope, '.top .label, .top h1, .top .dates').entries()) sweep(el, { scroll: false, delay: 0.3 + i * 0.12 })
}

function motion(scope: HTMLElement) {
  const digits = scope.querySelector('.digits')

  for (const [i, el] of all(scope, '.digits > *').entries()) block(el, { trigger: digits ?? el, delay: i * 0.06 })

  const card = scope.querySelector<HTMLElement>('.band .card')

  if (card) block(card)

  for (const el of all(scope, '.band .figures .num')) roll(el, el.classList.contains('year') ? { from: 1950 } : {})

  const schedule = scope.querySelector<HTMLElement>('.band .schedule')

  if (schedule && !REDUCED) gsap.from(all(schedule, 'li'), { '--hair': 0, duration: 1.2, ease: 'launch', stagger: 0.06, scrollTrigger: { trigger: schedule, start: 'top 85%', ...ONCE } })

  for (const el of all(scope, '.latest figure, .teaser .frame')) reveal(el, { drift: false })

  for (const el of all(scope, '.latest .gap')) roll(el)

  for (const el of all(scope, '.latest .order li:first-child')) block(el, { delay: 1.3 })

  for (const el of all(scope, '.teaser h2')) sweep(el)
}

export function Weekend() {
  const client = useQueryClient()
  const { data } = useSeason()
  const now = useSecond()
  const zone = useZone()
  const theme = useTheme().theme ?? 'light'
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    waitFor(client.fetchQuery(seasonQueryOptions))
  }, [client])

  const page = data ? weekendPage(data, now, zone) : null
  const ready = page !== null

  useGSAP(
    (_, safe) => {
      const scope = root.current

      if (!scope || !ready || !safe) return

      motion(scope)

      return onEnter(safe(() => hero(scope)))
    },
    { dependencies: [ready], scope: root },
  )

  if (!data || !page) {
    return (
      <div className="weekend-page">
        <p className="weekend-empty">{data ? 'No race on the calendar yet.' : 'The weekend data is on its way. Try again in a minute.'}</p>
      </div>
    )
  }

  return (
    <div className="weekend-page" ref={root}>
      <Top page={page} />
      <Clock page={page} snapshot={data} />
      <CircuitBand band={page.band} theme={opposite(theme)} />
      <Latest latest={page.latest} />
      <Teaser />
    </div>
  )
}
