import { Schema } from 'effect'

import { ConstructorStandings, DriverStandings, QualifyingResults, Race, RaceResults, Session } from './jolpica-schema.ts'

export const NextSession = Schema.Struct({
  round: Schema.Number,
  raceName: Schema.String,
  circuitName: Schema.String,
  country: Schema.String,
  session: Session,
})

export type NextSession = typeof NextSession.Type

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
})

export type SeasonSnapshot = typeof SeasonSnapshot.Type

export const SeasonSnapshotJson = Schema.fromJsonString(SeasonSnapshot)
