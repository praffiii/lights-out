import { expect, it } from 'bun:test'
import { Effect, Layer, Schema } from 'effect'

import { refreshSnapshot } from '../../src/season/refresh.ts'
import { KVWriteError, kvRest } from '../../src/season/kv-rest.ts'
import { SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'
import { SnapshotStore } from '../../src/season/store.ts'
import { fakeJolpica } from './fake-jolpica.ts'
import { fakeOpenF1 } from './fake-openf1.ts'

const TOKEN = 'secret-token-123'

const base = { accountId: 'acc', namespaceId: 'ns', token: TOKEN }

const valueUrl = 'https://api.cloudflare.com/client/v4/accounts/acc/storage/kv/namespaces/ns/values/season%3Av1'

const recordingFetch = (respond: (request: Request) => Response) => {
  const requests: Array<{ url: string; method: string; authorization: string | null; contentType: string | null; body: string }> = []

  const fetch: Parameters<typeof kvRest>[0]['fetch'] = async (input, init) => {
    const request = new Request(input, init)
    requests.push({ url: request.url, method: request.method, authorization: request.headers.get('authorization'), contentType: request.headers.get('content-type'), body: await request.clone().text() })

    return respond(request)
  }

  return { fetch, requests }
}

it('puts the value under the encoded key with a bearer token and an unchanged body', async () => {
  const { fetch, requests } = recordingFetch(() => new Response('{"success":true}', { status: 200 }))

  await kvRest({ ...base, fetch }).put('season:v1', '{"a":1}')

  expect(requests).toEqual([{ url: valueUrl, method: 'PUT', authorization: `Bearer ${TOKEN}`, contentType: 'application/octet-stream', body: '{"a":1}' }])
})

it('rejects a failed put with its status and never leaks the token', async () => {
  const { fetch } = recordingFetch(() => new Response(`forbidden ${TOKEN}`, { status: 403 }))

  const error = await kvRest({ ...base, fetch }).put('season:v1', '{}').catch((cause: Error) => cause)

  expect(error).toBeInstanceOf(KVWriteError)
  expect(error).toMatchObject({ status: 403 })
  expect(String(error)).not.toContain(TOKEN)
  expect(error instanceof Error ? error.message : '').not.toContain(TOKEN)
})

it('reads a missing key as null', async () => {
  const { fetch, requests } = recordingFetch(() => new Response('{}', { status: 404 }))

  expect(await kvRest({ ...base, fetch }).get('season:v1')).toBeNull()
  expect(requests[0]).toMatchObject({ url: valueUrl, method: 'GET', authorization: `Bearer ${TOKEN}` })
})

it('round-trips the fixture snapshot through SnapshotStore', async () => {
  const bodies = new Map<string, string>()

  const memoryFetch: Parameters<typeof kvRest>[0]['fetch'] = async (input, init) => {
    const request = new Request(input, init)

    if (request.method === 'PUT') {
      bodies.set(request.url, await request.text())

      return new Response('{}', { status: 200 })
    }

    const body = bodies.get(request.url)

    return body === undefined ? new Response('{}', { status: 404 }) : new Response(body, { status: 200 })
  }

  const snapshot = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot.json').text())

  const store = SnapshotStore.fromKV(kvRest({ ...base, fetch: memoryFetch }))

  const result = await Effect.runPromise(
    SnapshotStore.use((service) => service.write(snapshot).pipe(Effect.andThen(service.read))).pipe(Effect.provide(store)),
  )

  expect(result).toEqual(snapshot)
})

it('fails the refresh with the status and without the token when the KV write is rejected', async () => {
  const { fetch } = recordingFetch(() => new Response(`forbidden ${TOKEN}`, { status: 403 }))

  const services = Layer.mergeAll(fakeJolpica(), fakeOpenF1(), SnapshotStore.fromKV(kvRest({ ...base, fetch })))

  const failure = await Effect.runPromise(refreshSnapshot(new Date('2026-11-08T00:00:00Z')).pipe(Effect.provide(services))).catch((cause: Error) => String(cause))

  expect(failure).toContain('403')
  expect(failure).not.toContain(TOKEN)
})
