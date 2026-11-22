import { Schema } from 'effect'

import type { WordKey } from '#/chapter/words.ts'

import type { PartId } from './phase.ts'
import json from './rig.json'

export const PARTS = [
  { id: 'v6', n: '01', name: 'V6 engine', job: '1.6 litres, six cylinders. Burns fuel for about half the power.', terms: [] },
  { id: 'turbo', n: '02', name: 'Turbocharger', job: 'Exhaust gas spins it, and it packs more air into the engine.', terms: [] },
  { id: 'mguK', n: '03', name: 'MGU-K', job: 'An electric motor geared to the crank. Pushes, or brakes and charges.', terms: [] },
  { id: 'energyStore', n: '04', name: 'Energy store', job: 'The battery. It holds what the MGU-K harvests.', terms: [] },
  { id: 'electronics', n: '05', name: 'Control electronics', job: 'Sends the power between battery and motor.', terms: [] },
] as const satisfies ReadonlyArray<{ id: PartId; n: string; name: string; job: string; terms: ReadonlyArray<{ text: string; k: WordKey }> }>

export type EnginePart = (typeof PARTS)[number]

const Vec = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])

export type Vec = typeof Vec.Type

const Pair = Schema.Tuple([Schema.Number, Schema.Number])

const Pins = Schema.Record(Schema.String, Pair)

export const EngineRig = Schema.Struct({
  lens: Schema.Number,
  band: Schema.Struct({ position: Vec, target: Vec }),
  turn: Vec,
  pins: Pins,
  shadow: Schema.Struct({ centre: Vec, size: Pair, drop: Schema.Number }),
})

export type EngineRig = typeof EngineRig.Type

export const rig = Schema.decodeUnknownSync(EngineRig)(json)
