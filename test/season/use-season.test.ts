import { afterEach, expect, it, mock, spyOn } from 'bun:test'

import { fetchSeason, SeasonWarmingError, seasonQueryOptions } from '../../src/season/use-season.ts'
import { snapshotAt } from './snapshot.ts'

const stubFetch = (response: Response) => spyOn(globalThis, 'fetch').mockResolvedValue(response)

afterEach(() => {
  mock.restore()
})

it('decodes a 200 snapshot', async () => {
  stubFetch(Response.json(await snapshotAt('2026-11-08T00:00:00.000Z')))

  const snapshot = await fetchSeason()

  expect(snapshot.season).toBe(2026)
  expect(snapshot.nextSession?.round).toBe(20)
  expect(seasonQueryOptions.queryFn).toBe(fetchSeason)
  expect(seasonQueryOptions.staleTime).toBe(60_000)
})

it('throws SeasonWarmingError on 503', async () => {
  stubFetch(Response.json({ status: 'warming' }, { status: 503 }))

  await expect(fetchSeason()).rejects.toBeInstanceOf(SeasonWarmingError)
})

it('releases the response body when it gives up on a 503', async () => {
  const response = Response.json({ status: 'warming' }, { status: 503 })

  stubFetch(response)

  await expect(fetchSeason()).rejects.toBeInstanceOf(SeasonWarmingError)
  expect(response.bodyUsed).toBe(true)
})

it('rejects a snapshot missing season', async () => {
  const { season: _season, ...rest } = await snapshotAt('2026-11-08T00:00:00.000Z')

  stubFetch(Response.json(rest))

  await expect(fetchSeason()).rejects.toThrow()
})
