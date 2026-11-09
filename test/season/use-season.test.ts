import { afterEach, expect, it, mock, spyOn } from 'bun:test'

import { fetchSeason, retrySeason, SeasonWarmingError, seasonQueryOptions } from '../../src/season/use-season.ts'
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

it('decodes a snapshot written before history', async () => {
  stubFetch(new Response(await Bun.file('test/fixtures/season-snapshot-v1.json').text(), { headers: { 'content-type': 'application/json' } }))

  const snapshot = await fetchSeason()

  expect(snapshot.history).toBeUndefined()
})

it('a SeasonWarmingError is not retried', () => {
  expect(seasonQueryOptions.retry).toBe(retrySeason)
  expect(retrySeason(0, new SeasonWarmingError())).toBe(false)
  expect(retrySeason(0, new Error('down'))).toBe(true)
  expect(retrySeason(3, new Error('down'))).toBe(false)
})

it('fetchSeason passes an AbortSignal to fetch', async () => {
  const fetch = stubFetch(Response.json(await snapshotAt('2026-11-08T00:00:00.000Z')))

  await fetchSeason()

  expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
})
