import { Schema } from 'effect'

import { ConstructorStandings, DriverRef, DriverStandings, QualifyingResults, Race, RaceResults, Session, SessionName } from './jolpica-schema.ts'

export const NextSession = Schema.Struct({
  round: Schema.Number,
  raceName: Schema.String,
  circuitName: Schema.String,
  country: Schema.String,
  session: Session,
})

export type NextSession = typeof NextSession.Type

export const Leader = Schema.Struct({ round: Schema.Number, driver: DriverRef, lead: Schema.Number })

export type Leader = typeof Leader.Type

export const TeamPoints = Schema.Struct({ constructorId: Schema.String, driver: DriverRef, points: Schema.Number })

export type TeamPoints = typeof TeamPoints.Type

export const History = Schema.Struct({ round: Schema.Number, leaders: Schema.Array(Leader), teams: Schema.Array(TeamPoints) })

export type History = typeof History.Type

export const LatestRow = Schema.Struct({
  position: Schema.Number,
  code: Schema.String,
  family: Schema.String,
  name: Schema.String,
  team: Schema.String,
  colour: Schema.NullOr(Schema.String),
  time: Schema.NullOr(Schema.Number),
  gap: Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
})

export type LatestRow = typeof LatestRow.Type

export const LatestSession = Schema.Struct({
  season: Schema.Number,
  round: Schema.Number,
  name: SessionName,
  startsAt: Schema.String,
  rows: Schema.Array(LatestRow),
})

export type LatestSession = typeof LatestSession.Type

export const SeasonSnapshot = Schema.Struct({
  fetchedAt: Schema.String,
  season: Schema.Number,
  calendar: Schema.Array(Race),
  nextCalendar: Schema.Array(Race),
  nextSession: Schema.NullOr(NextSession),
  latest: Schema.NullOr(
    Schema.Struct({
      race: RaceResults,
      qualifying: Schema.NullOr(QualifyingResults),
      sprint: Schema.NullOr(RaceResults),
    }),
  ),
  driverStandings: DriverStandings,
  constructorStandings: ConstructorStandings,
  history: Schema.optionalKey(History),
  latestSession: Schema.optionalKey(LatestSession),
})

export type SeasonSnapshot = typeof SeasonSnapshot.Type

export const SeasonSnapshotJson = Schema.fromJsonString(SeasonSnapshot)
