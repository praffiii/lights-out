import { Effect, Schema } from 'effect'

import { MODELLED, type ModelledId } from '#/circuits/modelled.ts'

import { isComplete, PoleLap } from './schema.ts'
import type { PoleStore } from './store.ts'

export const Latest = Schema.Struct({
  circuit: Schema.Literals(MODELLED),
  lap: PoleLap,
})

export type Latest = typeof Latest.Type

export const LatestJson = Schema.fromJsonString(Latest)

const encode = Schema.encodeEffect(LatestJson)

const order = new Map<ModelledId, number>(MODELLED.map((id, i) => [id, i]))

const rank = (id: ModelledId) => order.get(id) ?? MODELLED.length

export const latestDry = (laps: ReadonlyArray<{ circuit: ModelledId; lap: PoleLap | null }>): Latest | null => {
  let best: { circuit: ModelledId; lap: PoleLap; at: number } | null = null

  for (const { circuit, lap } of laps) {
    if (!lap || lap.wet || !isComplete(lap) || !lap.date) continue

    const at = Date.parse(lap.date)

    if (!Number.isFinite(at)) continue

    if (!best || at > best.at || (at === best.at && rank(circuit) < rank(best.circuit))) best = { circuit, lap, at }
  }

  return best ? { circuit: best.circuit, lap: best.lap } : null
}

const empty = () => new Response(null, { status: 204, headers: { 'cache-control': 'public, max-age=300' } })

export const handleLatestRequest = (store: PoleStore['Service']): Effect.Effect<Response> =>
  Effect.forEach(MODELLED, (circuit) => store.read(circuit).pipe(Effect.map((lap) => ({ circuit, lap })))).pipe(
    Effect.map(latestDry),
    Effect.flatMap((picked) =>
      picked === null
        ? Effect.sync(empty)
        : encode(picked).pipe(
            Effect.orDie,
            Effect.map((json) => new Response(json, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' } })),
          ),
    ),
  )
