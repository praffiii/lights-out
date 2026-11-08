import { Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/http'

import { kvRest } from '../src/season/kv-rest.ts'
import { JolpicaClient } from '../src/season/jolpica-client.ts'
import { refreshSnapshot } from '../src/season/refresh.ts'
import { SnapshotStore } from '../src/season/store.ts'

const names = ['CLOUDFLARE_API_TOKEN', 'CF_ACCOUNT_ID', 'CF_KV_NAMESPACE_ID'] as const

const missing = names.find((name) => !process.env[name])

if (missing !== undefined) {
  console.error(`Missing environment variable ${missing}`)
  process.exit(1)
}

const kv = kvRest({
  token: process.env.CLOUDFLARE_API_TOKEN ?? '',
  accountId: process.env.CF_ACCOUNT_ID ?? '',
  namespaceId: process.env.CF_KV_NAMESPACE_ID ?? '',
  fetch: globalThis.fetch,
})

const services = Layer.merge(JolpicaClient.layer.pipe(Layer.provide(FetchHttpClient.layer)), SnapshotStore.fromKV(kv))

const code = await Effect.runPromise(refreshSnapshot(new Date()).pipe(Effect.provide(services))).then(
  (outcome) => (outcome === 'written' ? 0 : 1),
  (error) => {
    console.error(String(error))

    return 1
  },
)

process.exit(code)
