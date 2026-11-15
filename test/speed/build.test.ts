import { expect, it } from 'bun:test'
import { Effect, Schema } from 'effect'

import { topSpeed } from '../../src/speed/build.ts'
import { SpeedLapsResponse, type SpeedLap, type TopSpeed } from '../../src/speed/schema.ts'
import { seasonBest } from '../../src/speed/top.ts'
import { OpenF1Error, type OpenF1Client } from '../../src/season/openf1-client.ts'
import { SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'
import { driversOf, fakeOpenF1, sessions2026 } from '../season/fake-openf1.ts'

const mexico = Schema.decodeUnknownSync(SpeedLapsResponse)(await Bun.file('test/fixtures/openf1/laps-11404.json').json())

const broken = Schema.decodeUnknownEffect(SpeedLapsResponse)({}).pipe(Effect.mapError((cause) => new OpenF1Error({ path: '/laps', cause })))

const interlagosEnd = Date.parse(sessions2026.find((s) => s.session_key === 11412)?.date_end ?? '')

const slower: ReadonlyArray<SpeedLap> = [{ driver_number: 10, lap_number: 1, st_speed: 330 }]

const recorder = (laps: (key: number) => ReadonlyArray<SpeedLap> = (key) => (key === 11404 ? mexico : slower)) => {
  const keys: Array<number> = []
  const service: Partial<OpenF1Client['Service']> = { sessionLaps: (key) => Effect.sync(() => (keys.push(key), laps(key))), drivers: () => Effect.succeed(driversOf(11404)) }

  return { keys, service }
}

const speed = (season: number, at: Date | string, previous: TopSpeed | undefined, service: Partial<OpenF1Client['Service']>) =>
  Effect.runPromise(topSpeed(season, new Date(at), previous).pipe(Effect.provide(fakeOpenF1(service))))

const full = async () => {
  let result: TopSpeed | undefined

  for (const hour of [0, 1, 2]) result = await speed(2026, new Date(Date.parse('2026-11-15T00:00:00Z') + hour * 3_600_000), result, recorder().service)

  if (!result) throw new Error('a top speed for 2026')

  return result
}

it('builds the 2026 rows and the season best is Gasly in Mexico City', async () => {
  const result = await full()

  expect(result.season).toBe(2026)
  expect(result.races).toHaveLength(20)
  expect(seasonBest(result.races)).toMatchObject({ kmh: 361, surname: 'Gasly', circuit: 'Mexico City', lap: 48 })
})

it('a cold start fetches at most eight races a run and the next run carries on', async () => {
  const first = recorder()
  const partial = await speed(2026, '2026-11-15T00:00:00Z', undefined, first.service)

  expect(first.keys).toHaveLength(8)
  expect(partial?.races).toHaveLength(8)

  const second = recorder()
  const more = await speed(2026, '2026-11-15T01:00:00Z', partial, second.service)

  expect(second.keys).toHaveLength(8)
  expect(second.keys.some((key) => first.keys.includes(key))).toBe(false)
  expect(more?.races).toHaveLength(16)
})

it('a race older than 48 hours makes no laps request and is carried forward', async () => {
  const previous = await full()
  const { keys, service } = recorder()
  const result = await speed(2026, '2026-11-15T00:00:00Z', previous, service)

  expect(keys).toEqual([])
  expect(result?.races).toEqual(previous.races)
})

it('a race under 48 hours old is fetched again', async () => {
  const previous = await full()
  const { keys, service } = recorder()

  await speed(2026, new Date(interlagosEnd + 24 * 3_600_000), previous, service)

  expect(keys).toEqual([11412])
})

it('before the first race of the season, last season is used', async () => {
  expect((await speed(2026, '2026-03-01T00:00:00Z', undefined, recorder().service))?.season).toBe(2025)
})

it('an OpenF1 failure keeps the previous value', async () => {
  const previous = await full()

  expect(await speed(2026, new Date(interlagosEnd + 3_600_000), previous, { sessionLaps: () => broken })).toBe(previous)
})

it('an OpenF1 failure with no previous value omits the field', async () => {
  expect(await speed(2026, '2026-11-15T00:00:00Z', undefined, { sessionLaps: () => broken })).toBeUndefined()
})

it('a race with no speed trap readings writes no row and keeps an old one', async () => {
  const blank = recorder(() => [{ driver_number: 10, lap_number: 1, st_speed: null }]).service
  const at = new Date(interlagosEnd + 3_600_000)
  const previous = await full()

  expect(await speed(2026, at, undefined, blank)).toBeUndefined()
  expect((await speed(2026, at, previous, blank))?.races).toEqual(previous.races)
})

it('a snapshot without topSpeed still decodes', async () => {
  const snapshot = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot-v1.json').text())

  expect(snapshot.topSpeed).toBeUndefined()
})
