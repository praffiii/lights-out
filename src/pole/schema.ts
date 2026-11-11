import { Schema, SchemaGetter } from 'effect'

const Q3 = Schema.Array(Schema.NullOr(Schema.Number)).pipe(
  Schema.decodeTo(Schema.NullOr(Schema.Number), { decode: SchemaGetter.transform((parts) => parts[2] ?? null), encode: SchemaGetter.forbidden(() => 'OpenF1 responses are decode-only') }),
)

export const PoleResult = Schema.Struct({ position: Schema.NullOr(Schema.Number), driver_number: Schema.Number, duration: Schema.NullOr(Q3) })

export const PoleResultResponse = Schema.Array(PoleResult)

export const OpenF1Lap = Schema.Struct({
  driver_number: Schema.Number,
  lap_number: Schema.Number,
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

export const Stint = Schema.Struct({
  lap_start: Schema.NullOr(Schema.Number),
  lap_end: Schema.NullOr(Schema.Number),
  compound: Schema.NullOr(Schema.String),
})

export type Stint = typeof Stint.Type

export const LapsResponse = Schema.Array(OpenF1Lap)

export const CarResponse = Schema.Array(CarSample)

export const LocationResponse = Schema.Array(LocationSample)

export const StintsResponse = Schema.Array(Stint)

export const TelemetryRow = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number, Schema.Number, Schema.Number, Schema.Number])

export const PoleLap = Schema.Struct({
  sessionKey: Schema.Number,
  year: Schema.Number,
  driver: Schema.String,
  wet: Schema.Boolean,
  time: Schema.Number,
  sectors: Schema.Tuple([Schema.Number, Schema.Number, Schema.Number]),
  rows: Schema.Array(TelemetryRow),
})

export type PoleLap = typeof PoleLap.Type

export type PoleRow = typeof TelemetryRow.Type

export const PoleLapJson = Schema.fromJsonString(PoleLap)
