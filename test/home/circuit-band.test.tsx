import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, expect, it, setSystemTime } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { SeasonSnapshot } from '../../src/season/snapshot-schema.ts'
import { seasonQueryOptions } from '../../src/season/use-season.ts'
import { snapshotAt } from '../season/snapshot.ts'

const { cleanup, render } = await import('@testing-library/react')
const { CircuitBand } = await import('../../src/home/CircuitBand.tsx')

const NOW = '2026-11-06T15:00:00Z'

afterAll(async () => {
  setSystemTime()
  cleanup()
  await GlobalRegistrator.unregister()
})

const renderWith = (snapshot: SeasonSnapshot) => {
  const client = new QueryClient()

  client.setQueryData(seasonQueryOptions.queryKey, snapshot)
  setSystemTime(new Date(NOW))

  return render(
    <QueryClientProvider client={client}>
      <CircuitBand />
    </QueryClientProvider>,
  )
}

const unknownCircuit = (snapshot: SeasonSnapshot): SeasonSnapshot => ({
  ...snapshot,
  calendar: snapshot.calendar.map((race) => (race.round === 20 ? { ...race, circuit: { ...race.circuit, circuitId: 'nowhere' } } : race)),
})

it('shows the band for a circuit with a model', async () => {
  const { container } = renderWith(await snapshotAt(NOW))

  expect(container.querySelector('.weekend-sec h2')?.textContent).toBe('Interlagos,this weekend.')
  cleanup()
})

it('leaves the band out when the circuit has no model', async () => {
  const { container } = renderWith(unknownCircuit(await snapshotAt(NOW)))

  expect(container.querySelector('.weekend-sec')).toBeNull()
  cleanup()
})
