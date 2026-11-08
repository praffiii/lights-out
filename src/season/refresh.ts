import { Effect } from 'effect'

import { buildSnapshot } from './build-snapshot.ts'
import type { JolpicaClient } from './jolpica-client.ts'
import { SnapshotStore } from './store.ts'

export const refreshSnapshot = (now: Date): Effect.Effect<'written' | 'kept-previous', never, JolpicaClient | SnapshotStore> =>
  buildSnapshot(now).pipe(
    Effect.flatMap((snapshot) => SnapshotStore.use((store) => store.write(snapshot))),
    Effect.as('written' as const),
    Effect.catchTag('JolpicaError', (error) => Effect.logError('Season refresh failed, keeping the previous snapshot', error).pipe(Effect.as('kept-previous' as const))),
  )
