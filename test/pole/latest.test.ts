import { expect, it } from 'bun:test'
import { Effect, Schema } from 'effect'

import { handleLatestRequest, latestDry, LatestJson } from '../../src/pole/latest.ts'
import { PoleLapJson } from '../../src/pole/schema.ts'
import { poleKey, PoleStore } from '../../src/pole/store.ts'
import { fakeKV } from '../season/fake-kv.ts'

const MONZA_RAW = await Bun.file('test/fixtures/pole/monza.json').text()
const monza = Schema.decodeUnknownSync(PoleLapJson)(MONZA_RAW)
const oldVegas = Schema.decodeUnknownSync(PoleLapJson)(await Bun.file('test/fixtures/pole/vegas.json').text())

const respond = (kv: ReturnType<typeof fakeKV>['kv']) => Effect.runPromise(PoleStore.use((store) => handleLatestRequest(store)).pipe(Effect.provide(PoleStore.fromKV(kv))))

it('skips wet, incomplete and missing laps', () => {
  expect(
    latestDry([
      { circuit: 'interlagos', lap: { ...monza, wet: true } },
      { circuit: 'vegas', lap: oldVegas },
      { circuit: 'miami', lap: null },
    ]),
  ).toBeNull()
})

it('picks the newest date even when an older lap has a higher session key', () => {
  expect(
    latestDry([
      { circuit: 'monza', lap: { ...monza, sessionKey: 11730, date: '2026-09-05T14:00:00Z' } },
      { circuit: 'vegas', lap: { ...monza, sessionKey: 11416, date: '2026-11-21T04:00:00Z' } },
    ])?.circuit,
  ).toBe('vegas')
})

it('breaks a date tie by MODELLED order', () => {
  expect(
    latestDry([
      { circuit: 'monza', lap: monza },
      { circuit: 'vegas', lap: monza },
    ])?.circuit,
  ).toBe('vegas')
})

it('answers 204 when nothing qualifies and 200 with the circuit when one does', async () => {
  const empty = await respond(fakeKV().kv)

  expect(empty.status).toBe(204)
  expect(empty.headers.get('cache-control')).toBe('public, max-age=300')

  const ok = await respond(fakeKV({ [poleKey('monza')]: MONZA_RAW }).kv)

  expect(ok.status).toBe(200)
  expect(ok.headers.get('content-type')).toBe('application/json')
  expect(ok.headers.get('cache-control')).toBe('public, max-age=300')
  expect(Schema.decodeUnknownSync(LatestJson)(await ok.text())).toEqual({ circuit: 'monza', lap: monza })
})
