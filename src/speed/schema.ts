import { Schema } from 'effect'

export const SpeedLap = Schema.Struct({ driver_number: Schema.Number, lap_number: Schema.Number, st_speed: Schema.NullOr(Schema.Number) })

export type SpeedLap = typeof SpeedLap.Type

export const SpeedLapsResponse = Schema.Array(SpeedLap)

export const SpeedRace = Schema.Struct({
  sessionKey: Schema.Number,
  circuit: Schema.String,
  dateEnd: Schema.String,
  kmh: Schema.Number,
  driverNumber: Schema.Number,
  surname: Schema.String,
  lap: Schema.Number,
})

export type SpeedRace = typeof SpeedRace.Type

export const TopSpeed = Schema.Struct({ season: Schema.Number, races: Schema.Array(SpeedRace) })

export type TopSpeed = typeof TopSpeed.Type
