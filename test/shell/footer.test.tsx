import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it, setSystemTime } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { SeasonSnapshot } from '../../src/season/snapshot-schema.ts'
import { ShellContext } from '../../src/shell/context.ts'
import { seasonQueryOptions } from '../../src/season/use-season.ts'
import { snapshotAt } from '../season/snapshot.ts'

const { cleanup, render } = await import('@testing-library/react')
const { Footer } = await import('../../src/shell/Footer.tsx')

afterEach(() => cleanup())

afterAll(async () => {
  setSystemTime()
  await GlobalRegistrator.unregister()
})

const shell = { go: async () => {} }

const renderAt = (iso: string, snapshot?: SeasonSnapshot) => {
  const client = new QueryClient()

  if (snapshot) client.setQueryData(seasonQueryOptions.queryKey, snapshot)
  setSystemTime(new Date(iso))

  return render(
    <ShellContext.Provider value={shell}>
      <QueryClientProvider client={client}>
        <Footer />
      </QueryClientProvider>
    </ShellContext.Provider>,
  )
}

const text = (root: HTMLElement, selector: string) => root.querySelector(selector)?.textContent ?? null

it('counts down to the next lights out at the track', async () => {
  const at = '2026-11-06T15:00:00Z'
  const { container } = renderAt(at, await snapshotAt(at))

  expect(text(container, '.next-race .gp')).toBe('São Paulo GP')
  expect(text(container, '.next-race .meta')).toBe('Interlagos · round 20 of 23 · Sun 8 Nov · 14:00 local')
  expect([...container.querySelectorAll('.next-race .count b')].map((b) => b.textContent)).toEqual(['02', '02', '00', '00'])
  expect(container.querySelectorAll('.next-race .lights i')).toHaveLength(5)
})

it('keeps the race day of an unconfirmed start on its calendar date', async () => {
  const at = '2026-11-06T15:00:00Z'
  const snapshot = await snapshotAt(at)

  const calendar = snapshot.calendar.map((race) =>
    race.round === 20 ? { ...race, sessions: race.sessions.map((s) => (s.name === 'Race' ? { ...s, startsAt: '2026-11-08T00:00:00Z', timeConfirmed: false } : s)) } : race,
  )

  const { container } = renderAt(at, { ...snapshot, calendar })

  expect(text(container, '.next-race .meta')).toBe('Interlagos · round 20 of 23 · Sun 8 Nov · time TBC')
})

it('says the season is over when no race is left', async () => {
  const at = '2026-12-20T00:00:00Z'
  const { container } = renderAt(at, await snapshotAt(at))

  expect(text(container, '.next-race .gp')).toBe('2026 season complete')
  expect(text(container, '.next-race .meta')).toBe('The 2027 calendar is not out yet')
  expect(container.querySelector('.next-race .count')).toBeNull()
})

it('carries the start, every chapter, the credit and the disclaimer without season data', () => {
  const { container } = renderAt('2026-11-06T15:00:00Z')

  expect(container.querySelector('.next-race')).toBeNull()
  expect(text(container, '.start h2')).toBe('Five red lights.Then they go out.')
  expect(text(container, '.start figcaption')).toContain('Photo Yu Chu Chin · CC BY-SA 4.0')
  expect([...container.querySelectorAll('.footer .toc li')].map((li) => li.textContent)).toEqual([
    '01Home',
    '02How F1 worksSoon',
    '03This seasonSoon',
    '04The carSoon',
    '05The engineSoon',
    '06The tracksSoon',
    '07The peopleSoon',
    '08GlossarySoon',
  ])
  expect(container.querySelector('.footer .toc a')?.getAttribute('href')).toBe('/')
  expect(container.querySelector('.site a')?.getAttribute('href')).toBe('#main')
  expect(container.textContent).toContain('Lights Out is an unofficial fan project. Not affiliated with Formula 1, FOM or any team.')
})
