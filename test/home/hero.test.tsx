import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it, setSystemTime } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { SeasonSnapshot } from '../../src/season/snapshot-schema.ts'
import { seasonQueryOptions } from '../../src/season/use-season.ts'
import { snapshotAt } from '../season/snapshot.ts'

const { cleanup, render } = await import('@testing-library/react')
const { Hero } = await import('../../src/home/Hero.tsx')

const NOW = '2026-11-06T15:00:00Z'

afterEach(() => cleanup())

afterAll(async () => {
  setSystemTime()
  await GlobalRegistrator.unregister()
})

const renderWith = (snapshot: SeasonSnapshot) => {
  const client = new QueryClient()

  client.setQueryData(seasonQueryOptions.queryKey, snapshot)
  setSystemTime(new Date(NOW))

  return render(
    <QueryClientProvider client={client}>
      <Hero />
    </QueryClientProvider>,
  )
}

const unknownCircuit = (snapshot: SeasonSnapshot): SeasonSnapshot => ({
  ...snapshot,
  calendar: snapshot.calendar.map((race) => (race.round === 20 ? { ...race, circuit: { ...race.circuit, circuitId: 'nowhere' } } : race)),
})

it('shows the circuit, facts and caption for a circuit with a model', async () => {
  const { container } = renderWith(await snapshotAt(NOW))

  expect(container.querySelector('.hero h1')?.textContent).toBe('Formula 1,from lights out.')
  expect(container.querySelector('.hero .stage .poster')?.getAttribute('src')).toBe('/circuits/br-1940.webp')
  expect(container.querySelector('.hero .stage .poster')?.getAttribute('srcset')).toBe('/circuits/br-1940-1440.webp 1440w, /circuits/br-1940.webp 2880w')
  expect(container.querySelector('.hero .facts')?.textContent).toContain('4.309 km')
  expect(container.querySelector('.hero .note')?.textContent).toContain('Interlagos · São Paulo GP · this weekend · round 20 of 23')
  expect(container.querySelector('.hero .tracker')).not.toBeNull()
})

it('keeps the Tracker but leaves the circuit out when the circuit has no model', async () => {
  const { container } = renderWith(unknownCircuit(await snapshotAt(NOW)))

  expect(container.querySelector('.hero .tracker')).not.toBeNull()
  expect(container.querySelector('.hero .stage')).toBeNull()
  expect(container.querySelector('.hero .facts')).toBeNull()
})

it('credits the OpenStreetMap map under the circuit instead of contours', async () => {
  const note = renderWith(await snapshotAt(NOW)).container.querySelector('.hero .note')?.textContent ?? ''

  expect(note).toEndWith('Map © OpenStreetMap contributors (ODbL)')
  expect(note).not.toContain('Contours')
})
