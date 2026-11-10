import { Effect } from 'effect'

import { allCircuits, type CircuitInfo } from '#/circuits/registry.ts'
import { OpenF1Client } from '#/season/openf1-client.ts'
import type { OpenF1Session } from '#/season/openf1-schema.ts'

import { latestQualifying, poleLap } from './pole-lap.ts'
import { PoleStore } from './store.ts'

export type PoleOutcome = { id: string; outcome: 'written' | 'unchanged' | 'kept' }

const refreshOne = (info: CircuitInfo, sessions: ReadonlyArray<OpenF1Session>, now: Date) =>
  PoleStore.use((store) =>
    Effect.gen(function* () {
      const session = latestQualifying(sessions, info, now)

      if (!session) return 'kept' as const

      const previous = yield* store.read(info.id)

      if (previous?.sessionKey === session.session_key) return 'unchanged' as const

      const built = yield* poleLap(info, session)

      if ('skip' in built) {
        yield* Effect.logWarning(`Pole lap for ${info.id} kept: ${built.skip}`)

        return 'kept' as const
      }

      yield* store.write(info.id, built.lap)

      return 'written' as const
    }),
  ).pipe(Effect.catchCause((cause) => Effect.logWarning(`Pole lap for ${info.id} failed, keeping the previous one`, cause).pipe(Effect.as('kept' as const))))

export const refreshPoles = (now: Date): Effect.Effect<ReadonlyArray<PoleOutcome>, never, OpenF1Client | PoleStore> =>
  OpenF1Client.use((client) => Effect.all([client.sessions(now.getUTCFullYear()), client.sessions(now.getUTCFullYear() - 1)])).pipe(
    Effect.map(([current, last]) => [...current, ...last]),
    Effect.flatMap((sessions) => Effect.forEach(allCircuits(), (info) => refreshOne(info, sessions, now).pipe(Effect.map((outcome) => ({ id: info.id, outcome }))))),
    Effect.catchCause((cause) => Effect.logWarning('Pole laps failed, keeping every previous one', cause).pipe(Effect.as(allCircuits().map((info) => ({ id: info.id, outcome: 'kept' as const }))))),
  )
