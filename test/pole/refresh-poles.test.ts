import { expect, it } from 'bun:test'
import { Effect, Layer, Schema } from 'effect'

import { OpenF1Error } from '../../src/season/openf1-client.ts'
import { refreshPoles } from '../../src/pole/refresh-poles.ts'
import { LocationResponse } from '../../src/pole/schema.ts'
import { PoleStore } from '../../src/pole/store.ts'
import type { OpenF1Client } from '../../src/season/openf1-client.ts'
import { fakeKV } from '../season/fake-kv.ts'
import { fakeOpenF1, fakeOpenF1Service, sessions2026 } from '../season/fake-openf1.ts'

const NOW = new Date('2026-11-10T12:00:00Z')

const run = (kv: ReturnType<typeof fakeKV>['kv'], overrides: Partial<OpenF1Client['Service']> = {}) =>
  Effect.runPromise(refreshPoles(NOW).pipe(Effect.provide(Layer.mergeAll(fakeOpenF1(overrides), PoleStore.fromKV(kv)))))

const stored = (kv: ReturnType<typeof fakeKV>['kv'], id: string) => Effect.runPromise(PoleStore.use((s) => s.read(id)).pipe(Effect.provide(PoleStore.fromKV(kv))))

it("stores this year's pole when this year's qualifying is done", async () => {
  const { kv } = fakeKV()

  await run(kv)

  const lap = await stored(kv, 'interlagos')

  expect(lap?.sessionKey).toBe(11408)
  expect(lap?.year).toBe(2026)
  expect(lap?.time).toBe(87.47)
})

it("falls back to last year's pole before this year's qualifying", async () => {
  const { kv } = fakeKV()

  await run(kv)

  const lap = await stored(kv, 'vegas')

  expect(lap?.sessionKey).toBe(9854)
  expect(lap?.year).toBe(2025)
  expect(lap?.driver).toBe('Lando Norris')
})

it('ignores Sprint Qualifying', async () => {
  const { kv } = fakeKV()
  const sprint = { ...sessions2026.find((s) => s.session_key === 11408), session_key: 99999, session_name: 'Sprint Qualifying', date_start: '2026-11-09T10:00:00+00:00', date_end: '2026-11-09T11:00:00+00:00', circuit_short_name: 'Interlagos' }

  await run(kv, { sessions: (year) => fakeOpenF1Service.sessions(year).pipe(Effect.map((list) => (year === 2026 ? [...list, sprint] : list))) })

  expect((await stored(kv, 'interlagos'))?.sessionKey).toBe(11408)
})

it('marks a lap wet when the pole was set on intermediate or wet tyres', async () => {
  const { kv } = fakeKV()

  await run(kv)

  expect((await stored(kv, 'vegas'))?.wet).toBe(true)
  expect((await stored(kv, 'interlagos'))?.wet).toBe(true)
  expect((await stored(kv, 'albert_park'))?.wet).toBe(false)
})

it('writes nothing when the stored lap is already this session', async () => {
  const { kv, entries } = fakeKV()

  await run(kv)

  const before = new Map(entries)
  const outcomes = await run(kv)

  expect(outcomes.every((o) => o.outcome === 'unchanged')).toBe(true)
  expect(new Map(entries)).toEqual(before)
})

it('keeps the stored lap when the newest qualifying has no pole time yet', async () => {
  const { kv } = fakeKV()

  await run(kv, { sessions: (year) => fakeOpenF1Service.sessions(year === 2026 ? 2025 : year) })

  const old = await stored(kv, 'interlagos')
  const outcomes = await run(kv, { result: (key) => (key === 11408 ? Effect.succeed([]) : fakeOpenF1Service.result(key)) })

  expect(outcomes.find((o) => o.id === 'interlagos')?.outcome).toBe('kept')
  expect(await stored(kv, 'interlagos')).toEqual(old)
})

it('one circuit failing keeps the others', async () => {
  const { kv } = fakeKV()
  const broken = Schema.decodeUnknownEffect(LocationResponse)({}).pipe(Effect.mapError((cause) => new OpenF1Error({ path: '/location', cause })))

  const outcomes = await run(kv, { location: (key, driver, from, to) => (key === 9854 ? broken : fakeOpenF1Service.location(key, driver, from, to)) })

  expect(outcomes.find((o) => o.id === 'vegas')?.outcome).toBe('kept')
  expect(outcomes.filter((o) => o.outcome === 'written').map((o) => o.id).sort()).toEqual(['albert_park', 'interlagos', 'losail', 'yas_marina'])
})

it('stays under 15 KB per circuit', async () => {
  const { kv, entries } = fakeKV()

  await run(kv)

  expect(entries.size).toBe(5)
  expect([...entries.values()].every((json) => json.length <= 15_000)).toBe(true)
})
