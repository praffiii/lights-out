import { Effect } from 'effect'

import { buildSnapshot } from './build-snapshot.ts'
import type { JolpicaClient } from './jolpica-client.ts'
import type { OpenF1Client } from './openf1-client.ts'
import { SnapshotStore } from './store.ts'

export const refreshSnapshot = (now: Date): Effect.Effect<'written' | 'kept-previous', never, JolpicaClient | OpenF1Client | SnapshotStore> =>
  SnapshotStore.use((store) =>
    Effect.gen(function* () {
      const previous = yield* store.read
      const snapshot = yield* buildSnapshot(now)
      const kept = previous?.latestSession

      yield* store.write(kept && !snapshot.latestSession && kept.season === snapshot.season ? { ...snapshot, latestSession: kept } : snapshot)
    }),
  ).pipe(
    Effect.as('written' as const),
    Effect.catchTag('JolpicaError', (error) => Effect.logError('Season refresh failed, keeping the previous snapshot', { path: error.path, cause: String(error.cause) }).pipe(Effect.as('kept-previous' as const))),
  )
