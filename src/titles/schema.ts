import { Schema } from 'effect'

const Scored = Schema.Tuple([Schema.String, Schema.String, Schema.Number])

export const TitleRound = Schema.Struct({
  round: Schema.Number,
  name: Schema.String,
  locality: Schema.String,
  date: Schema.String,
  sprint: Schema.Boolean,
  winner: Schema.String,
  rows: Schema.Array(Scored),
  finishes: Schema.Array(Scored),
})

export type TitleRound = typeof TitleRound.Type

export const Titles = Schema.Struct({
  season: Schema.Number,
  drivers: Schema.Record(Schema.String, Schema.Struct({ code: Schema.NullOr(Schema.String), family: Schema.String })),
  teams: Schema.Record(Schema.String, Schema.Struct({ name: Schema.String })),
  rounds: Schema.Array(TitleRound),
  left: Schema.Array(Schema.Struct({ round: Schema.Number, sprint: Schema.Boolean })),
})

export type Titles = typeof Titles.Type
