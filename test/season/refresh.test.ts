import { expect, it } from 'bun:test'
import { Effect, Layer, Logger, Schema } from 'effect'
import { HttpClientError, HttpClientRequest, HttpClientResponse } from 'effect/http'

import { JolpicaError } from '../../src/season/jolpica-client.ts'
import { RacesResponse } from '../../src/season/jolpica-schema.ts'
import { refreshSnapshot } from '../../src/season/refresh.ts'
import { SnapshotStore } from '../../src/season/store.ts'
import { fakeJolpica } from './fake-jolpica.ts'
import { fakeOpenF1 } from './fake-openf1.ts'
import { fakeKV } from './fake-kv.ts'
import { snapshotAt } from './snapshot.ts'

const now = new Date('2026-11-08T00:00:00Z')

const readBack = (kv: ReturnType<typeof fakeKV>['kv']) => Effect.runPromise(SnapshotStore.use((store) => store.read).pipe(Effect.provide(SnapshotStore.fromKV(kv))))

it('writes the snapshot when Jolpica succeeds', async () => {
  const { kv } = fakeKV()
  const result = await Effect.runPromise(refreshSnapshot(now).pipe(Effect.provide(Layer.mergeAll(fakeJolpica(), fakeOpenF1(), SnapshotStore.fromKV(kv)))))

  expect(result).toBe('written')
  expect((await readBack(kv))?.season).toBe(2026)
})

it('keeps the previous snapshot when Jolpica fails', async () => {
  const { kv } = fakeKV()
  const previous = await snapshotAt('2026-11-01T00:00:00.000Z')

  await Effect.runPromise(SnapshotStore.use((store) => store.write(previous)).pipe(Effect.provide(SnapshotStore.fromKV(kv))))

  const broken = Schema.decodeUnknownEffect(RacesResponse)({}).pipe(Effect.mapError((cause) => new JolpicaError({ path: '/current/races/', cause })))

  const result = await Effect.runPromise(
    refreshSnapshot(now).pipe(Effect.provide(Layer.mergeAll(fakeJolpica({ races: () => broken }), fakeOpenF1(), SnapshotStore.fromKV(kv)))),
  )

  expect(result).toBe('kept-previous')
  expect((await readBack(kv))?.fetchedAt).toBe('2026-11-01T00:00:00.000Z')
})

it('treats corrupt stored JSON as empty', async () => {
  const { kv } = fakeKV({ 'season:v1': '{not json' })

  expect(await readBack(kv)).toBeNull()
})

it('logs the failing path and the HTTP status when Jolpica rejects the request', async () => {
  const { kv } = fakeKV()
  const request = HttpClientRequest.get('https://api.jolpi.ca/ergast/f1/current/races/?limit=100')

  const rateLimited = Effect.fail(
    new JolpicaError({
      path: '/current/races/?limit=100',
      cause: new HttpClientError.HttpClientError({
        reason: new HttpClientError.StatusCodeError({ request, response: HttpClientResponse.fromWeb(request, new Response('', { status: 429 })) }),
      }),
    }),
  )

  const lines: Array<string> = []
  const capture = Logger.layer([Logger.map(Logger.formatSimple, (line) => void lines.push(line))])

  const result = await Effect.runPromise(
    refreshSnapshot(now).pipe(Effect.provide(Layer.mergeAll(fakeJolpica({ races: () => rateLimited }), fakeOpenF1(), SnapshotStore.fromKV(kv), capture))),
  )

  expect(result).toBe('kept-previous')
  expect(lines.join('\n')).toContain('Season refresh failed, keeping the previous snapshot')
  expect(lines.join('\n')).toContain('/current/races/?limit=100')
  expect(lines.join('\n')).toContain('429')
})

const store = (kv: ReturnType<typeof fakeKV>['kv'], previous: Awaited<ReturnType<typeof snapshotAt>>) =>
  Effect.runPromise(SnapshotStore.use((s) => s.write(previous)).pipe(Effect.provide(SnapshotStore.fromKV(kv))))

const refreshAt = (iso: string, kv: ReturnType<typeof fakeKV>['kv'], openf1 = fakeOpenF1()) =>
  Effect.runPromise(refreshSnapshot(new Date(iso)).pipe(Effect.provide(Layer.mergeAll(fakeJolpica(), openf1, SnapshotStore.fromKV(kv)))))

it('keeps the stored latestSession when OpenF1 has nothing new', async () => {
  const { kv } = fakeKV()
  const previous = await snapshotAt('2026-11-06T21:00:00Z')

  expect(previous.latestSession?.name).toBe('FP2')

  await store(kv, previous)
  await refreshAt('2026-11-07T15:00:00Z', kv, fakeOpenF1({ result: () => Effect.succeed([]) }))

  expect((await readBack(kv))?.latestSession).toEqual(previous.latestSession)
})

it('replaces it when OpenF1 has a newer one', async () => {
  const { kv } = fakeKV()

  await store(kv, await snapshotAt('2026-11-06T21:00:00Z'))
  await refreshAt('2026-11-07T20:00:00Z', kv)

  expect((await readBack(kv))?.latestSession?.name).toBe('Qualifying')
})

it('drops a stored latestSession from another season', async () => {
  const { kv } = fakeKV()
  const previous = await snapshotAt('2026-11-06T21:00:00Z')
  const fp2 = previous.latestSession

  if (!fp2) throw new Error('the fixture has an FP2 result')

  await store(kv, { ...previous, latestSession: { ...fp2, season: 2025 } })
  await refreshAt('2026-11-07T15:00:00Z', kv, fakeOpenF1({ result: () => Effect.succeed([]) }))

  expect((await readBack(kv))?.latestSession).toBeUndefined()
})
