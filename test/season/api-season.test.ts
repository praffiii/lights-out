import { expect, it } from 'bun:test'
import { Effect, Schema } from 'effect'

import { handleSeasonRequest } from '../../src/season/handle-season-request.ts'
import { SeasonSnapshot } from '../../src/season/snapshot-schema.ts'
import { SnapshotStore } from '../../src/season/store.ts'
import { fakeKV } from './fake-kv.ts'
import { snapshotAt } from './snapshot.ts'

const respond = (kv: ReturnType<typeof fakeKV>['kv']) =>
  Effect.runPromise(SnapshotStore.use(handleSeasonRequest).pipe(Effect.provide(SnapshotStore.fromKV(kv))))

it('api returns 503 warming when the store is empty', async () => {
  const response = await respond(fakeKV().kv)

  expect(response.status).toBe(503)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(await response.json()).toEqual({ status: 'warming' })
})

it('api returns the snapshot with cache headers', async () => {
  const { kv } = fakeKV()
  const snapshot = await snapshotAt('2026-11-08T00:00:00.000Z')

  await Effect.runPromise(SnapshotStore.use((store) => store.write(snapshot)).pipe(Effect.provide(SnapshotStore.fromKV(kv))))

  const response = await respond(kv)

  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('application/json')
  expect(response.headers.get('cache-control')).toContain('max-age=60')
  expect(Schema.decodeUnknownSync(SeasonSnapshot)(await response.json()).season).toBe(2026)
})
