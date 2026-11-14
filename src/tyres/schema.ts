import { Schema } from 'effect'

export const Compound = Schema.Literals(['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'])

export type Compound = typeof Compound.Type

export const PositionResponse = Schema.Array(Schema.Struct({ date: Schema.String, driver_number: Schema.Number, position: Schema.Number }))

const Row = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])

const Car = Schema.Struct({
  number: Schema.Number,
  code: Schema.String,
  name: Schema.String,
  team: Schema.String,
  rows: Schema.Array(Row),
  laps: Schema.Array(Schema.Tuple([Schema.Number, Schema.Number])),
  stints: Schema.Array(Schema.Struct({ compound: Compound, lapStart: Schema.Number, ageAtStart: Schema.Number })),
  stop: Schema.Struct({ lap: Schema.Number, entry: Schema.Number, exit: Schema.Number, stopS: Schema.Number, laneS: Schema.Number }),
})

export type UndercutCar = typeof Car.Type

export const UndercutFile = Schema.Struct({
  session: Schema.Number,
  race: Schema.String,
  year: Schema.Number,
  totalLaps: Schema.Number,
  lengthM: Schema.Number,
  pit: Schema.Struct({ points: Schema.Array(Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])), u: Schema.Number }),
  positions: Schema.Array(Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])),
  early: Car,
  late: Car,
})

export type UndercutFile = typeof UndercutFile.Type
