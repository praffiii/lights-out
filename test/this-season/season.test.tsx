import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it, mock, setSystemTime, spyOn } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { SeasonSnapshot } from '../../src/season/snapshot-schema.ts'
import { ShellContext } from '../../src/shell/context.ts'
import { seasonQueryOptions } from '../../src/season/use-season.ts'
import { snapshotAt } from '../season/snapshot.ts'

const { cleanup, render, waitFor } = await import('@testing-library/react')
const { Season } = await import('../../src/this-season/Season.tsx')

const NOW = '2026-11-06T15:00:00Z'

afterEach(() => {
  cleanup()
  mock.restore()
})

afterAll(async () => {
  setSystemTime()
  await GlobalRegistrator.unregister()
})

const renderWith = (snapshot?: SeasonSnapshot) => {
  const client = new QueryClient()

  if (snapshot) client.setQueryData(seasonQueryOptions.queryKey, snapshot)
  setSystemTime(new Date(NOW))

  return render(
    <ShellContext.Provider value={{ go: async () => {}, surface: async () => {} }}>
      <QueryClientProvider client={client}>
        <Season />
      </QueryClientProvider>
    </ShellContext.Provider>,
  )
}

const WAITING = 'The season data is on its way. Try again in a minute.'

it('Season renders the six sections in order', async () => {
  const { container } = renderWith(await snapshotAt(NOW))
  const sections = [...container.querySelectorAll('section')].map((section) => section.className.split(' ')[0])

  expect(sections).toEqual(['title-fight', 'calendar', 'drivers', 'constructors', 'who-led', 'this-weekend'])
  expect(container.querySelector('.season-empty')).toBeNull()
})

it('Season shows the waiting line while pending and on a 503', async () => {
  spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => {}))

  const pending = renderWith()

  expect(pending.container.querySelector('.season-empty')?.textContent).toBe(WAITING)
  cleanup()
  mock.restore()
  spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'warming' }, { status: 503 }))

  const warming = renderWith()

  await waitFor(() => expect(warming.container.querySelector('.season-empty')?.textContent).toBe(WAITING))
  expect(warming.container.querySelector('section')).toBeNull()
})
