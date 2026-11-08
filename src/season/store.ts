import { Context, Effect, Layer, Schema } from 'effect'

import { type SeasonSnapshot, SeasonSnapshotJson } from './snapshot-schema.ts'

export type KVText = {
  readonly get: (key: string) => Promise<string | null>
  readonly put: (key: string, value: string) => Promise<void>
}

const KEY = 'season:v1'

const decode = Schema.decodeUnknownEffect(SeasonSnapshotJson)

const encode = Schema.encodeEffect(SeasonSnapshotJson)

export class SnapshotStore extends Context.Service<
  SnapshotStore,
  {
    readonly read: Effect.Effect<SeasonSnapshot | null>
    readonly write: (snapshot: SeasonSnapshot) => Effect.Effect<void>
  }
>()('SnapshotStore') {
  static readonly fromKV = (kv: KVText) =>
    Layer.succeed(SnapshotStore, {
      read: Effect.promise(() => kv.get(KEY)).pipe(
        Effect.flatMap((raw) =>
          raw === null ? Effect.succeed(null) : decode(raw).pipe(Effect.catch((error) => Effect.logWarning('Stored season snapshot is corrupt', error).pipe(Effect.as(null)))),
        ),
      ),
      write: (snapshot) =>
        encode(snapshot).pipe(
          Effect.orDie,
          Effect.flatMap((json) => Effect.promise(() => kv.put(KEY, json))),
        ),
    })
}
