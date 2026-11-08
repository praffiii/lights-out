import handler from '@tanstack/react-start/server-entry'
import { Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/http'

import { JolpicaClient } from './season/jolpica-client.ts'
import { refreshSnapshot } from './season/refresh.ts'
import { SnapshotStore } from './season/store.ts'

export default {
  fetch: (request) => handler.fetch(request),
  scheduled: (controller, env, ctx) => {
    const services = Layer.merge(JolpicaClient.layer.pipe(Layer.provide(FetchHttpClient.layer)), SnapshotStore.fromKV(env.SEASON_KV))

    ctx.waitUntil(Effect.runPromise(refreshSnapshot(new Date(controller.scheduledTime)).pipe(Effect.provide(services))))
  },
} satisfies ExportedHandler<Env>
