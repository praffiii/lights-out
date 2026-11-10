import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { Effect } from 'effect'

import { handlePoleRequest } from '#/pole/handle-pole-request.ts'
import { PoleStore } from '#/pole/store.ts'

export const Route = createFileRoute('/api/pole/$circuit')({
  server: {
    handlers: {
      GET: ({ params }) => Effect.runPromise(PoleStore.use((store) => handlePoleRequest(store, params.circuit)).pipe(Effect.provide(PoleStore.fromKV(env.SEASON_KV)))),
    },
  },
})
