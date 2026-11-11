import { Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/http'

import { refreshPoles } from '../src/pole/refresh-poles.ts'
import { PoleStore } from '../src/pole/store.ts'
import { kvRest } from '../src/season/kv-rest.ts'
import { JolpicaClient } from '../src/season/jolpica-client.ts'
import { OpenF1Client } from '../src/season/openf1-client.ts'
import { refreshSnapshot } from '../src/season/refresh.ts'
import { SnapshotStore } from '../src/season/store.ts'

const { CLOUDFLARE_API_TOKEN: token, CF_ACCOUNT_ID: accountId, CF_KV_NAMESPACE_ID: namespaceId } = process.env

const missing = [
  ['CLOUDFLARE_API_TOKEN', token],
  ['CF_ACCOUNT_ID', accountId],
  ['CF_KV_NAMESPACE_ID', namespaceId],
].find(([, value]) => !value)

if (!token || !accountId || !namespaceId) {
  console.error(`Missing environment variable ${missing?.[0]}`)
  process.exit(1)
}

const kv = kvRest({ token, accountId, namespaceId, fetch: globalThis.fetch })

const services = Layer.mergeAll(Layer.merge(JolpicaClient.layer, OpenF1Client.layer).pipe(Layer.provide(FetchHttpClient.layer)), SnapshotStore.fromKV(kv), PoleStore.fromKV(kv))

const run = Effect.gen(function* () {
  const outcome = yield* refreshSnapshot(new Date())
  const poles = yield* refreshPoles(new Date())

  yield* Effect.log(`Pole laps: ${poles.map((p) => `${p.id} ${p.outcome}`).join(', ')}`)

  return outcome
})

const code = await Effect.runPromise(run.pipe(Effect.provide(services))).then(
  (outcome) => (outcome === 'written' ? 0 : 1),
  (error) => {
    console.error(String(error))

    return 1
  },
)

process.exit(code)
