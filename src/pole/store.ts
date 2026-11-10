import { Context, Effect, Layer, Schema } from 'effect'

import type { KVText } from '#/season/store.ts'

import { type PoleLap, PoleLapJson } from './schema.ts'

export const poleKey = (id: string) => `pole:v1:${id}`

const decode = Schema.decodeUnknownEffect(PoleLapJson)

const encode = Schema.encodeEffect(PoleLapJson)

export class PoleStore extends Context.Service<
  PoleStore,
  {
    readonly read: (id: string) => Effect.Effect<PoleLap | null>
    readonly write: (id: string, lap: PoleLap) => Effect.Effect<void>
  }
>()('PoleStore') {
  static readonly fromKV = (kv: KVText) =>
    Layer.succeed(PoleStore, {
      read: (id) =>
        Effect.promise(() => kv.get(poleKey(id))).pipe(
          Effect.flatMap((raw) => (raw === null ? Effect.succeed(null) : decode(raw).pipe(Effect.catch((error) => Effect.logWarning(`Stored pole lap for ${id} is corrupt`, error).pipe(Effect.as(null)))))),
        ),
      write: (id, lap) =>
        encode(lap).pipe(
          Effect.orDie,
          Effect.flatMap((json) => Effect.promise(() => kv.put(poleKey(id), json))),
        ),
    })
}
