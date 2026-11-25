import { Schema } from 'effect'

export const RaceFile = Schema.Struct({
  session: Schema.Number,
  race: Schema.String,
  date: Schema.String,
  laps: Schema.Number,
  winner: Schema.String,
  first: Schema.String,
  pass: Schema.Struct({ by: Schema.String, on: Schema.String, lap: Schema.Number }),
  penalty: Schema.Struct({ driver: Schema.String, lap: Schema.Number, seconds: Schema.Number }),
  safetyCar: Schema.Number,
  stops: Schema.Number,
  overtake: Schema.Number,
  trap: Schema.Struct({ driver: Schema.String, lap: Schema.Number, kmh: Schema.Number }),
})

export type RaceFile = typeof RaceFile.Type
