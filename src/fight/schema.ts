import { Schema } from 'effect'

import { Car } from '#/pass/schema.ts'

export const FightFile = Schema.Struct({
  session: Schema.Number,
  race: Schema.String,
  year: Schema.Number,
  laps: Schema.Tuple([Schema.Number, Schema.Number]),
  lengthM: Schema.Number,
  cars: Schema.Tuple([Car, Car]),
})

export type FightFile = typeof FightFile.Type
