import { expect, it } from 'bun:test'
import { Effect, Layer, Schema } from 'effect'

import { JolpicaError } from '../../src/season/jolpica-client.ts'
import { RacesResponse } from '../../src/season/jolpica-schema.ts'
import { refreshSnapshot } from '../../src/season/refresh.ts'
import { SnapshotStore } from '../../src/season/store.ts'
import { fakeJolpica } from './fake-jolpica.ts'
import { fakeKV } from './fake-kv.ts'
import { snapshotAt } from './snapshot.ts'

const now = new Date('2026-11-08T00:00:00Z')

const readBack = (kv: ReturnType<typeof fakeKV>['kv']) => Effect.runPromise(SnapshotStore.use((store) => store.read).pipe(Effect.provide(SnapshotStore.fromKV(kv))))

it('writes the snapshot when Jolpica succeeds', async () => {
  const { kv } = fakeKV()
  const result = await Effect.runPromise(refreshSnapshot(now).pipe(Effect.provide(Layer.merge(fakeJolpica(), SnapshotStore.fromKV(kv)))))

  expect(result).toBe('written')
  expect((await readBack(kv))?.season).toBe(2026)
})

it('keeps the previous snapshot when Jolpica fails', async () => {
  const { kv } = fakeKV()
  const previous = await snapshotAt('2026-11-01T00:00:00.000Z')

  await Effect.runPromise(SnapshotStore.use((store) => store.write(previous)).pipe(Effect.provide(SnapshotStore.fromKV(kv))))

  const broken = Schema.decodeUnknownEffect(RacesResponse)({}).pipe(Effect.mapError((cause) => new JolpicaError({ path: '/current/races/', cause })))

  const result = await Effect.runPromise(
    refreshSnapshot(now).pipe(Effect.provide(Layer.merge(fakeJolpica({ races: () => broken }), SnapshotStore.fromKV(kv)))),
  )

  expect(result).toBe('kept-previous')
  expect((await readBack(kv))?.fetchedAt).toBe('2026-11-01T00:00:00.000Z')
})

it('treats corrupt stored JSON as empty', async () => {
  const { kv } = fakeKV({ 'season:v1': '{not json' })

  expect(await readBack(kv)).toBeNull()
})
