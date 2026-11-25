import { Schema } from 'effect'

export const GhostRow = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])

export type GhostRow = typeof GhostRow.Type

export const GhostLap = Schema.Struct({ lap: Schema.Number, gap: Schema.Number, rows: Schema.Array(GhostRow) })

export type GhostLap = typeof GhostLap.Type

export const GhostFile = Schema.Struct({
  session: Schema.Number,
  race: Schema.String,
  year: Schema.Number,
  driver: Schema.Struct({ code: Schema.String, name: Schema.String, team: Schema.String }),
  lengthM: Schema.Number,
  open: Schema.Number,
  from: Schema.Number,
  to: Schema.Number,
  end: Schema.Number,
  laps: Schema.Tuple([GhostLap, GhostLap]),
})

export type GhostFile = typeof GhostFile.Type
