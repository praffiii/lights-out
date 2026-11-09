import { Schema, SchemaGetter } from 'effect'

export const OpenF1Session = Schema.Struct({
  session_key: Schema.Number,
  session_name: Schema.String,
  date_start: Schema.String,
  date_end: Schema.String,
  is_cancelled: Schema.optionalKey(Schema.Boolean),
})

export type OpenF1Session = typeof OpenF1Session.Type

const noEncode = <T, E>() => SchemaGetter.forbidden<T, E>(() => 'OpenF1 responses are decode-only')

const LastSet = Schema.Array(Schema.NullOr(Schema.Number)).pipe(
  Schema.decodeTo(Schema.NullOr(Schema.Number), {
    decode: SchemaGetter.transform((parts) => parts.filter((part) => part !== null).at(-1) ?? null),
    encode: noEncode(),
  }),
)

const NoTime = Schema.String.pipe(Schema.decodeTo(Schema.Null, { decode: SchemaGetter.transform(() => null), encode: noEncode() }))

export const OpenF1Result = Schema.Struct({
  position: Schema.NullOr(Schema.Number),
  driver_number: Schema.Number,
  duration: Schema.NullOr(Schema.Union([Schema.Number, LastSet, NoTime])),
  gap_to_leader: Schema.NullOr(Schema.Union([Schema.Number, Schema.String, LastSet])),
})

export type OpenF1Result = typeof OpenF1Result.Type

export const OpenF1Driver = Schema.Struct({
  driver_number: Schema.Number,
  name_acronym: Schema.String,
  first_name: Schema.String,
  last_name: Schema.String,
  team_name: Schema.String,
  team_colour: Schema.NullOr(Schema.String),
})

export type OpenF1Driver = typeof OpenF1Driver.Type

export const SessionsResponse = Schema.Array(OpenF1Session)

export const ResultResponse = Schema.Array(OpenF1Result)

export const DriversResponse = Schema.Array(OpenF1Driver)
