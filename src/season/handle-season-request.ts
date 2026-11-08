import { Effect, Schema } from 'effect'

import { SeasonSnapshotJson } from './snapshot-schema.ts'
import type { SnapshotStore } from './store.ts'

const encode = Schema.encodeEffect(SeasonSnapshotJson)

export const handleSeasonRequest = (store: SnapshotStore['Service']): Effect.Effect<Response> =>
  store.read.pipe(
    Effect.flatMap((snapshot) =>
      snapshot === null
        ? Effect.succeed(Response.json({ status: 'warming' }, { status: 503, headers: { 'cache-control': 'no-store' } }))
        : encode(snapshot).pipe(
            Effect.orDie,
            Effect.map((json) => new Response(json, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' } })),
          ),
    ),
  )
