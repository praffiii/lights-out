import { expect, it } from 'bun:test'
import { type Duration, Effect, Fiber, Layer, Logger } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'
import { TestClock } from 'effect/testing'

import { latestSession } from '../../src/season/latest-session.ts'
import { OpenF1Client } from '../../src/season/openf1-client.ts'
import { calendar2026 } from './fake-jolpica.ts'
import { driversOf, fakeOpenF1, resultOf } from './fake-openf1.ts'

const calendar = calendar2026.races

const at = (iso: string, layer = fakeOpenF1(), races = calendar) => Effect.runPromise(latestSession(races, 2026, new Date(iso)).pipe(Effect.provide(layer)))

const anyKey = (from: number, asked: Array<number> = []) =>
  fakeOpenF1({
    result: (key) => {
      asked.push(key)

      return Effect.succeed(resultOf(from))
    },
    drivers: () => Effect.succeed(driversOf(from)),
  })

it('picks the newest session out of its live window', async () => {
  const latest = await at('2026-11-06T21:00:00Z')

  expect(latest?.season).toBe(2026)
  expect(latest?.round).toBe(20)
  expect(latest?.name).toBe('FP2')
  expect(latest?.startsAt).toBe('2026-11-06T19:00:00Z')
  expect(latest?.rows[0]).toMatchObject({ position: 1, code: 'ANT', time: 70.763, gap: 0 })
  expect(latest?.rows[1]).toMatchObject({ position: 2, code: 'NOR', family: 'Norris', name: 'Lando Norris', team: 'McLaren', colour: 'F47600' })
})

it('a session counts as live until 30 minutes after it ends', async () => {
  expect((await at('2026-11-06T20:20:00Z', anyKey(11406)))?.name).toBe('FP1')
  expect((await at('2026-11-06T20:31:00Z', anyKey(11406)))?.name).toBe('FP2')
})

it('qualifying takes the last time and gap each driver set', async () => {
  const latest = await at('2026-11-07T20:00:00Z')

  expect(latest?.name).toBe('Qualifying')
  expect(latest?.rows[0]).toMatchObject({ position: 1, time: 87.47, gap: 0 })
  expect(latest?.rows.at(-1)).toMatchObject({ position: 22, time: 101.564, gap: 10.625 })
})

it('a race drops unclassified drivers and keeps a lapped gap as text', async () => {
  const latest = await at('2026-11-08T20:00:00Z')

  expect(latest?.name).toBe('Race')
  expect(latest?.rows).toHaveLength(20)
  expect(latest?.rows.map((row) => row.position)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  expect(latest?.rows.some((row) => row.gap === '+2 LAPS')).toBe(true)
})

it('matches a session that started at another time than the calendar says', async () => {
  const latest = await at('2026-05-04T00:00:00Z', anyKey(11412))

  expect(latest?.round).toBe(4)
  expect(latest?.name).toBe('Race')
})

it('skips cancelled sessions', async () => {
  const asked: Array<number> = []
  const latest = await at('2026-04-20T00:00:00Z', anyKey(11412, asked))

  expect(asked).toHaveLength(1)
  expect(asked[0]).not.toBeOneOf([11254, 11255, 11256, 11257, 11261, 11262, 11263, 11264, 11265, 11269])
  expect(latest?.round).toBe(3)
  expect(latest?.name).toBe('Race')
})

it('skips testing days', async () => {
  const asked: Array<number> = []

  expect(await at('2026-02-25T00:00:00Z', anyKey(11412, asked))).toBeUndefined()
  expect(asked).toEqual([])
})

it('a session with no result yet gives nothing', async () => {
  expect(await at('2026-11-06T17:30:00Z')).toBeUndefined()
})

it('a session the calendar does not know gives nothing', async () => {
  const missing = calendar.filter((race) => race.round !== 20)

  expect(await at('2026-11-06T21:00:00Z', fakeOpenF1(), missing)).toBeUndefined()
})

const reply = (respond: (url: string) => Response) =>
  OpenF1Client.layer.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, HttpClient.make((request) => Effect.succeed(HttpClientResponse.fromWeb(request, respond(request.url)))))))

const settle = <A, E>(effect: Effect.Effect<A, E, OpenF1Client>, layer: Layer.Layer<OpenF1Client>, after: Duration.Input = '5 seconds') =>
  Effect.runPromise(
    Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(effect)

      yield* TestClock.adjust(after)

      return yield* Fiber.join(fiber)
    }).pipe(Effect.provide(layer), Effect.provide(TestClock.layer())),
  )

it('the client reads a 404 result as no rows', async () => {
  const value = await settle(
    OpenF1Client.use((openf1) => openf1.result(11254)),
    reply(() => Response.json({ detail: 'No results found.' }, { status: 404 })),
  )

  expect(value).toEqual([])
})

it('a refused request gives nothing and a warning', async () => {
  const lines: Array<string> = []
  const capture = Logger.layer([Logger.map(Logger.formatSimple, (line) => void lines.push(line))])

  const value = await settle(
    latestSession(calendar, 2026, new Date('2026-11-06T21:00:00Z')),
    Layer.merge(
      reply(() => Response.json({ detail: 'live session' }, { status: 401 })),
      capture,
    ),
  )

  expect(value).toBeUndefined()
  expect(lines.join('\n')).toContain('latest session skipped')
  expect(lines.join('\n')).toContain('401')
})

it('gives up after 20 seconds', async () => {
  const value = await settle(
    latestSession(calendar, 2026, new Date('2026-11-06T21:00:00Z')),
    fakeOpenF1({ sessions: () => Effect.never }),
    '21 seconds',
  )

  expect(value).toBeUndefined()
})
