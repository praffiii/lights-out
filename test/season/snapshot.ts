import { Effect, Layer } from 'effect'

import { buildSnapshot } from '../../src/season/build-snapshot.ts'
import type { JolpicaClient } from '../../src/season/jolpica-client.ts'
import type { OpenF1Client } from '../../src/season/openf1-client.ts'
import { fakeJolpica } from './fake-jolpica.ts'
import { fakeOpenF1 } from './fake-openf1.ts'

export const snapshotAt = (iso: string, overrides: Partial<JolpicaClient['Service']> = {}, openf1: Partial<OpenF1Client['Service']> = {}) =>
  Effect.runPromise(buildSnapshot(new Date(iso)).pipe(Effect.provide(Layer.merge(fakeJolpica(overrides), fakeOpenF1(openf1)))))
