import { expect, it } from 'bun:test'
import { Effect, Fiber, Layer, Predicate, Schema } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'
import { TestClock } from 'effect/testing'

import { buildSnapshot } from '../../src/season/build-snapshot.ts'
import { JolpicaClient, JolpicaError } from '../../src/season/jolpica-client.ts'
import { RacesResponse, SeasonResultsResponse } from '../../src/season/jolpica-schema.ts'
import { SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'
import { calendar2026, calendar2027, fake, fakeJolpica, fixture, noRaces, qualifying } from './fake-jolpica.ts'
import { fakeOpenF1 } from './fake-openf1.ts'

const run = (now: string, overrides: Partial<JolpicaClient['Service']> = {}) =>
  Effect.runPromise(buildSnapshot(new Date(now)).pipe(Effect.provide(Layer.merge(fakeJolpica(overrides), fakeOpenF1()))))

it('picks the next future session mid-season', async () => {
  const snapshot = await run('2026-05-20T00:00:00Z')

  expect(snapshot.season).toBe(2026)
  expect(snapshot.nextSession?.round).toBe(5)
  expect(snapshot.nextSession?.session.name).toBe('FP1')
})

it('looks into next season when the current one is over', async () => {
  const snapshot = await run('2026-12-10T00:00:00Z', {
    races: (season) => Effect.succeed(season === 2027 ? calendar2027 : calendar2026),
  })

  expect(snapshot.season).toBe(2026)
  expect(snapshot.nextSession?.round).toBe(1)
  expect(snapshot.nextSession?.session.name).toBe('FP1')
  expect(snapshot.nextCalendar[0]?.season).toBe(2027)
})

it('returns nextSession null when next season is not published', async () => {
  const snapshot = await run('2026-12-10T00:00:00Z')

  expect(snapshot.nextSession).toBeNull()
  expect(snapshot.nextCalendar).toEqual([])
})

it("falls back to last season's standings when the new season has none", async () => {
  const snapshot = await run('2027-01-10T00:00:00Z', {
    races: (season) => Effect.succeed(season === 'current' || season === 2027 ? calendar2027 : noRaces),
  })

  expect(snapshot.season).toBe(2027)
  expect(snapshot.driverStandings?.season).toBe(2026)
  expect(snapshot.constructorStandings?.season).toBe(2026)
})

it('latest.sprint is null on a non-sprint weekend', async () => {
  const snapshot = await run('2026-11-08T00:00:00Z')

  expect(snapshot.latest?.race.race?.round).toBe(19)
  expect(snapshot.latest?.qualifying?.race?.round).toBe(19)
  expect(snapshot.latest?.sprint).toBeNull()
})

it('drops a qualifying result that belongs to a later round than the latest race', async () => {
  const nextQualifying = { ...qualifying, race: qualifying.race && { ...qualifying.race, round: 20 } }
  const snapshot = await run('2026-11-08T00:00:00Z', { lastQualifying: () => Effect.succeed(nextQualifying) })

  expect(snapshot.latest?.race.race?.round).toBe(19)
  expect(snapshot.latest?.qualifying).toBeNull()
})

it('latest is null before the first race of a season', async () => {
  const snapshot = await run('2026-03-01T00:00:00Z', { lastResults: () => Effect.succeed({ race: null, rows: [] }) })

  expect(snapshot.latest).toBeNull()
})

it('fails with JolpicaError when any endpoint fails', async () => {
  const broken = Schema.decodeUnknownEffect(RacesResponse)({}).pipe(Effect.mapError((cause) => new JolpicaError({ path: '/current/races/', cause })))

  const exit = await Effect.runPromise(
    buildSnapshot(new Date('2026-05-20T00:00:00Z')).pipe(
      Effect.provide(Layer.merge(fakeJolpica({ races: () => broken }), fakeOpenF1())),
      Effect.flip,
    ),
  )

  expect(Predicate.isTagged(exit, 'JolpicaError')).toBe(true)
})

it('jolpica client retries a 429 then succeeds', async () => {
  const body = await fixture('races-2026')
  let calls = 0

  const http = HttpClient.make((request) => {
    calls += 1

    return Effect.succeed(HttpClientResponse.fromWeb(request, calls === 1 ? new Response('slow down', { status: 429 }) : Response.json(body)))
  })

  const races = await Effect.runPromise(
    Effect.gen(function* () {
      const jolpica = yield* JolpicaClient
      const fiber = yield* Effect.forkChild(jolpica.races(2026))

      yield* TestClock.adjust('1 second')

      return yield* Fiber.join(fiber)
    }).pipe(
      Effect.provide(JolpicaClient.layer.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, http)))),
      Effect.provide(TestClock.layer()),
    ),
  )

  expect(races.season).toBe(2026)
  expect(calls).toBe(2)
})

const brokenPage = Schema.decodeUnknownEffect(SeasonResultsResponse)({}).pipe(Effect.mapError((cause) => new JolpicaError({ path: '/2026/results/', cause })))

it('the snapshot carries history for the standings season', async () => {
  const snapshot = await run('2026-11-06T15:00:00Z')

  expect(snapshot.history?.round).toBe(19)
  expect(snapshot.history?.leaders).toHaveLength(19)
})

it('history fetches pages one at a time until offset reaches the total', async () => {
  const calls: Array<string> = []

  const snapshot = await run('2026-11-06T15:00:00Z', {
    seasonResults: (season, offset) => Effect.sync(() => calls.push(`results ${season} ${offset}`)).pipe(Effect.andThen(fake.seasonResults(season, offset))),
    seasonSprints: (season, offset) => Effect.sync(() => calls.push(`sprint ${season} ${offset}`)).pipe(Effect.andThen(fake.seasonSprints(season, offset))),
  })

  expect(calls).toEqual(['results 2026 0', 'results 2026 100', 'results 2026 200', 'results 2026 300', 'results 2026 400', 'sprint 2026 0', 'sprint 2026 100'])
  expect(snapshot.history?.round).toBe(19)
})

it('a failing history page still writes the core snapshot', async () => {
  const snapshot = await run('2026-11-06T15:00:00Z', {
    seasonResults: (season, offset) => (offset === 200 ? brokenPage : fake.seasonResults(season, offset)),
  })

  expect(snapshot.history).toBeUndefined()
  expect(snapshot.nextSession?.round).toBe(20)
  expect(snapshot.driverStandings?.rows.length).toBe(25)
})

it('a history page that never answers times out after 20 s and the core snapshot stays', async () => {
  const snapshot = await Effect.runPromise(
    Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(buildSnapshot(new Date('2026-11-06T15:00:00Z')))

      yield* TestClock.adjust('21 seconds')

      return yield* Fiber.join(fiber)
    }).pipe(Effect.provide(Layer.merge(fakeJolpica({ seasonSprints: () => Effect.never }), fakeOpenF1())), Effect.provide(TestClock.layer())),
  )

  expect(snapshot.history).toBeUndefined()
  expect(snapshot.nextSession?.round).toBe(20)
})

it('no standings means no history', async () => {
  const asked: Array<number> = []

  const snapshot = await run('2026-11-06T15:00:00Z', {
    driverStandings: () => Effect.succeed(null),
    seasonResults: (season, offset) => Effect.sync(() => asked.push(offset)).pipe(Effect.andThen(fake.seasonResults(season, offset))),
  })

  expect(snapshot.history).toBeUndefined()
  expect(asked).toEqual([])
})

it('a snapshot written before history still decodes', async () => {
  const legacy = await Bun.file('test/fixtures/season-snapshot-v1.json').text()
  const snapshot = await Effect.runPromise(Schema.decodeEffect(SeasonSnapshotJson)(legacy))

  expect(snapshot.history).toBeUndefined()
  expect(snapshot.season).toBe(2026)
})
