import { expect, it } from 'bun:test'
import { Effect, Schema } from 'effect'

import { handlePoleRequest } from '../../src/pole/handle-pole-request.ts'
import { PoleLapJson } from '../../src/pole/schema.ts'
import { poleKey, PoleStore } from '../../src/pole/store.ts'
import { fakeKV } from '../season/fake-kv.ts'

const VEGAS = await Bun.file('test/fixtures/pole/vegas.json').text()

const respond = (kv: ReturnType<typeof fakeKV>['kv'], id: string) => Effect.runPromise(PoleStore.use((store) => handlePoleRequest(store, id)).pipe(Effect.provide(PoleStore.fromKV(kv))))

it('serves a stored lap', async () => {
  const response = await respond(fakeKV({ [poleKey('vegas')]: VEGAS }).kv, 'vegas')

  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('application/json')
  expect(response.headers.get('cache-control')).toBe('public, max-age=300')
  expect(Schema.decodeUnknownSync(PoleLapJson)(await response.text()).driver).toBe('Lando Norris')
})

it('404s a circuit with no model', async () => {
  const response = await respond(fakeKV().kv, 'monaco')

  expect(response.status).toBe(404)
  expect(response.headers.get('cache-control')).toBe('public, max-age=3600')
})

it('404s a circuit with nothing stored', async () => {
  const response = await respond(fakeKV().kv, 'vegas')

  expect(response.status).toBe(404)
  expect(response.headers.get('cache-control')).toBe('public, max-age=300')
})

it('404s a corrupt stored lap', async () => {
  const response = await respond(fakeKV({ [poleKey('vegas')]: '{not json' }).kv, 'vegas')

  expect(response.status).toBe(404)
})
