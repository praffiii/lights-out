import { Schema } from 'effect'

export const OpenF1Lap = Schema.Struct({
  driver_number: Schema.Number,
  lap_duration: Schema.NullOr(Schema.Number),
  date_start: Schema.NullOr(Schema.String),
  duration_sector_1: Schema.NullOr(Schema.Number),
  duration_sector_2: Schema.NullOr(Schema.Number),
  duration_sector_3: Schema.NullOr(Schema.Number),
})

export type OpenF1Lap = typeof OpenF1Lap.Type

export const CarSample = Schema.Struct({
  date: Schema.String,
  speed: Schema.Number,
  n_gear: Schema.Number,
  throttle: Schema.Number,
  brake: Schema.Number,
})

export type CarSample = typeof CarSample.Type

export const LocationSample = Schema.Struct({
  date: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
})

export type LocationSample = typeof LocationSample.Type

export const WeatherSample = Schema.Struct({
  date: Schema.String,
  rainfall: Schema.Number,
})

export type WeatherSample = typeof WeatherSample.Type

export const LapsResponse = Schema.Array(OpenF1Lap)

export const CarResponse = Schema.Array(CarSample)

export const LocationResponse = Schema.Array(LocationSample)

export const WeatherResponse = Schema.Array(WeatherSample)

const Row = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number, Schema.Number, Schema.Number, Schema.Number])

export const PoleLap = Schema.Struct({
  sessionKey: Schema.Number,
  year: Schema.Number,
  driver: Schema.String,
  wet: Schema.Boolean,
  time: Schema.Number,
  sectors: Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]),
  rows: Schema.Array(Row),
})

export type PoleLap = typeof PoleLap.Type

export type PoleRow = typeof Row.Type

export const PoleLapJson = Schema.fromJsonString(PoleLap)
