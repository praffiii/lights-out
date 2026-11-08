import { Effect } from 'effect'

import { buildSnapshot } from '../../src/season/build-snapshot.ts'
import type { JolpicaClient } from '../../src/season/jolpica-client.ts'
import { fakeJolpica } from './fake-jolpica.ts'

export const snapshotAt = (iso: string, overrides: Partial<JolpicaClient['Service']> = {}) =>
  Effect.runPromise(buildSnapshot(new Date(iso)).pipe(Effect.provide(fakeJolpica(overrides))))
