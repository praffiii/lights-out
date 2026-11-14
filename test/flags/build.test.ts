import { expect, it } from 'bun:test'
import { Effect, Schema } from 'effect'

import { flagTally } from '../../src/flags/build.ts'
import { RaceControlResponse, type FlagTally } from '../../src/flags/schema.ts'
import { OpenF1Error, type OpenF1Client } from '../../src/season/openf1-client.ts'
import { SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'
import { fakeOpenF1, sessions2026 } from '../season/fake-openf1.ts'

const suzuka = Schema.decodeUnknownSync(RaceControlResponse)(await Bun.file('test/fixtures/openf1/race-control-11253.json').json())

const broken = Schema.decodeUnknownEffect(RaceControlResponse)({}).pipe(Effect.mapError((cause) => new OpenF1Error({ path: '/race_control', cause })))

const interlagosEnd = Date.parse(sessions2026.find((s) => s.session_key === 11412)?.date_end ?? '')

const recorder = (rows: (key: number) => typeof suzuka = () => suzuka) => {
  const keys: Array<number> = []
  const years: Array<number> = []

  const service: Partial<OpenF1Client['Service']> = {
    raceControl: (key) => Effect.sync(() => (keys.push(key), rows(key))),
    redFlags: (year) => Effect.sync(() => (years.push(year), [])),
  }

  return { keys, years, service }
}

const tally = (season: number, at: Date | string, previous: FlagTally | undefined, service: Partial<OpenF1Client['Service']>) =>
  Effect.runPromise(flagTally(season, new Date(at), previous).pipe(Effect.provide(fakeOpenF1(service))))

const full = async () => {
  const { service } = recorder()
  const result = await tally(2026, '2026-11-15T00:00:00Z', undefined, service)

  if (!result) throw new Error('a tally for 2026')

  return result
}

it('tallies every finished 2026 race', async () => {
  const { keys, service } = recorder()
  const result = await tally(2026, '2026-11-15T00:00:00Z', undefined, service)

  expect(result?.season).toBe(2026)
  expect(result?.races).toHaveLength(20)
  expect(result?.races[0]?.circuit).toBe('Melbourne')
  expect(keys).toHaveLength(20)
})

it('an unchanged race list older than 48 hours makes no race_control request', async () => {
  const previous = await full()
  const { keys, service } = recorder()
  const result = await tally(2026, '2026-11-15T00:00:00Z', previous, service)

  expect(keys).toEqual([])
  expect(result?.races).toEqual(previous.races)
})

it('a race under 48 hours old is fetched again', async () => {
  const previous = await full()
  const { keys, service } = recorder()

  await tally(2026, new Date(interlagosEnd + 24 * 3_600_000), previous, service)

  expect(keys).toEqual([11412])
})

it('a race with no race control yet gets no row and is asked for again', async () => {
  const { service } = recorder((key) => (key === 11412 ? [] : suzuka))
  const partial = await tally(2026, '2026-11-15T00:00:00Z', undefined, service)

  expect(partial?.races).toHaveLength(19)

  const later = recorder()

  await tally(2026, new Date(interlagosEnd + 3 * 86_400_000), partial, later.service)

  expect(later.keys).toEqual([11412])
})

it('falls back to last season before the first race', async () => {
  const { years, service } = recorder()
  const result = await tally(2026, '2026-03-01T00:00:00Z', undefined, service)

  expect(result?.season).toBe(2025)
  expect(years).toEqual([2025])
})

it('keeps the previous tally when OpenF1 fails', async () => {
  const previous = await full()
  const result = await tally(2026, new Date(interlagosEnd + 3_600_000), previous, { raceControl: () => broken })

  expect(result).toBe(previous)
})

it('omits the field when OpenF1 fails and there is no previous tally', async () => {
  expect(await tally(2026, '2026-11-15T00:00:00Z', undefined, { raceControl: () => broken })).toBeUndefined()
})

it('a snapshot without flags still decodes', async () => {
  const snapshot = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot-v1.json').text())

  expect(snapshot.flags).toBeUndefined()
})
