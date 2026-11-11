import { Schema, SchemaGetter } from 'effect'

import { TelemetryRow } from '#/pole/schema.ts'

export const OvertakesResponse = Schema.Array(
  Schema.Struct({
    date: Schema.String,
    overtaking_driver_number: Schema.Number,
    overtaken_driver_number: Schema.Number,
    position: Schema.Number,
  }),
)

export const PitResponse = Schema.Array(Schema.Struct({ driver_number: Schema.Number, lap_number: Schema.Number }))

const Lapped = Schema.String.pipe(Schema.decodeTo(Schema.Null, { decode: SchemaGetter.transform(() => null), encode: SchemaGetter.forbidden(() => 'OpenF1 responses are decode-only') }))

export const IntervalsResponse = Schema.Array(Schema.Struct({ date: Schema.String, interval: Schema.NullOr(Schema.Union([Schema.Number, Lapped])) }))

const Car = Schema.Struct({ code: Schema.String, name: Schema.String, team: Schema.String, rows: Schema.Array(TelemetryRow) })

export const PassFile = Schema.Struct({
  session: Schema.Number,
  race: Schema.String,
  year: Schema.Number,
  lap: Schema.Number,
  position: Schema.Number,
  lengthM: Schema.Number,
  chaser: Car,
  leader: Car,
})

export type PassFile = typeof PassFile.Type

export type PassCar = typeof Car.Type

export const PassFileJson = Schema.fromJsonString(PassFile)
