import { Schema } from 'effect'

export const RaceControl = Schema.Struct({
  session_key: Schema.Number,
  lap_number: Schema.NullOr(Schema.Number),
  category: Schema.String,
  flag: Schema.NullOr(Schema.String),
  message: Schema.String,
})

export type RaceControl = typeof RaceControl.Type

export const RaceControlResponse = Schema.Array(RaceControl)

export const FlagSample = Schema.Struct({ lap: Schema.Number, message: Schema.String })

export type FlagSample = typeof FlagSample.Type

export const FlagRace = Schema.Struct({
  sessionKey: Schema.Number,
  circuit: Schema.String,
  dateEnd: Schema.String,
  clear: Schema.Number,
  yellow: Schema.Number,
  doubleYellow: Schema.Number,
  blue: Schema.Number,
  red: Schema.Number,
  chequered: Schema.Number,
  blackWhite: Schema.Number,
  blackWhiteTrackLimits: Schema.Number,
  safetyCars: Schema.Number,
  vscs: Schema.Number,
  samples: Schema.Struct({
    clear: Schema.optionalKey(FlagSample),
    yellow: Schema.optionalKey(FlagSample),
    blue: Schema.optionalKey(FlagSample),
    chequered: Schema.optionalKey(FlagSample),
  }),
})

export type FlagRace = typeof FlagRace.Type

export const FlagTally = Schema.Struct({ season: Schema.Number, races: Schema.Array(FlagRace), redSessions: Schema.Number })

export type FlagTally = typeof FlagTally.Type
