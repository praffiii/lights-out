import { Schema } from 'effect'

import { QualifyingPlace } from '../season/jolpica-schema.ts'

export const PersonRow = Schema.Struct({
  round: Schema.Number,
  grid: Schema.Number,
  position: Schema.Number,
  positionText: Schema.String,
  points: Schema.Number,
  constructorId: Schema.String,
})

export type PersonRow = typeof PersonRow.Type

export const Team = Schema.Struct({ constructorId: Schema.String, name: Schema.String })

export type Team = typeof Team.Type

export const Past = Schema.Struct({
  through: Schema.Number,
  starts: Schema.Number,
  wins: Schema.Number,
  podiums: Schema.Number,
  poles: Schema.Number,
  points: Schema.Number,
  seasons: Schema.Array(Schema.Number),
  teams: Schema.Array(Team),
  firstWin: Schema.NullOr(Schema.Struct({ season: Schema.Number, country: Schema.String })),
  finals: Schema.Array(Schema.Struct({ season: Schema.Number, position: Schema.NullOr(Schema.Number) })),
})

export type Past = typeof Past.Type

export const Round = Schema.Struct({ round: Schema.Number, raceName: Schema.String, locality: Schema.String, country: Schema.String })

export type Round = typeof Round.Type

export const People = Schema.Struct({
  season: Schema.Number,
  rounds: Schema.Array(Round),
  results: Schema.Record(Schema.String, Schema.Array(PersonRow)),
  sprintPoints: Schema.Record(Schema.String, Schema.Number),
  qualifying: Schema.Array(Schema.Struct({ round: Schema.Number, rows: Schema.Array(QualifyingPlace) })),
  born: Schema.Record(Schema.String, Schema.String),
  past: Schema.Record(Schema.String, Past),
})

export type People = typeof People.Type
