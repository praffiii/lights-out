import { Effect, Schema } from 'effect'

import { isModelled } from '#/circuits/modelled.ts'

import { PoleLapJson } from './schema.ts'
import type { PoleStore } from './store.ts'

const encode = Schema.encodeEffect(PoleLapJson)

const missing = (maxAge: number) => Response.json({ status: 'none' }, { status: 404, headers: { 'cache-control': `public, max-age=${maxAge}` } })

export const handlePoleRequest = (store: PoleStore['Service'], id: string): Effect.Effect<Response> =>
  isModelled(id)
    ? store.read(id).pipe(
        Effect.flatMap((lap) =>
          lap === null
            ? Effect.succeed(missing(300))
            : encode(lap).pipe(
                Effect.orDie,
                Effect.map((json) => new Response(json, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' } })),
              ),
        ),
      )
    : Effect.succeed(missing(3600))
