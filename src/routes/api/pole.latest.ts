import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { Effect } from 'effect'

import { handleLatestRequest } from '#/pole/latest.ts'
import { PoleStore } from '#/pole/store.ts'

export const Route = createFileRoute('/api/pole/latest')({
  server: {
    handlers: {
      GET: () => Effect.runPromise(PoleStore.use((store) => handleLatestRequest(store)).pipe(Effect.provide(PoleStore.fromKV(env.SEASON_KV)))),
    },
  },
})
