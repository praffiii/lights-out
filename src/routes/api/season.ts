import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { Effect } from 'effect'

import { handleSeasonRequest } from '#/season/handle-season-request.ts'
import { SnapshotStore } from '#/season/store.ts'

export const Route = createFileRoute('/api/season')({
  server: {
    handlers: {
      GET: () => Effect.runPromise(SnapshotStore.use(handleSeasonRequest).pipe(Effect.provide(SnapshotStore.fromKV(env.SEASON_KV)))),
    },
  },
})
