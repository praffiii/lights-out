import { Effect, Layer, Schema } from 'effect'

import { JolpicaClient } from '../../src/season/jolpica-client.ts'
import {
  ConstructorStandingsResponse,
  DriverStandingsResponse,
  QualifyingResponse,
  RaceResultsResponse,
  RacesResponse,
  type ResultRow,
  type SeasonResults,
  SeasonResultsResponse,
  SeasonSprintsResponse,
  SprintResponse,
} from '../../src/season/jolpica-schema.ts'

export const fixture = (name: string) => Bun.file(`test/fixtures/jolpica/${name}.json`).json()

export const calendar2026 = Schema.decodeUnknownSync(RacesResponse)(await fixture('races-2026'))
export const noRaces = Schema.decodeUnknownSync(RacesResponse)(await fixture('races-empty'))
export const results = Schema.decodeUnknownSync(RaceResultsResponse)(await fixture('results-last'))
export const qualifying = Schema.decodeUnknownSync(QualifyingResponse)(await fixture('qualifying-last'))
export const noSprint = Schema.decodeUnknownSync(SprintResponse)(await fixture('sprint-empty'))
export const drivers = Schema.decodeUnknownSync(DriverStandingsResponse)(await fixture('driverstandings-2026'))
export const constructors = Schema.decodeUnknownSync(ConstructorStandingsResponse)(await fixture('constructorstandings-2026'))
export const raceResults2026 = Schema.decodeUnknownSync(SeasonResultsResponse)(await fixture('results-2026'))
export const sprintResults2026 = Schema.decodeUnknownSync(SeasonSprintsResponse)(await fixture('sprint-2026'))

export const calendar2027 = {
  season: 2027,
  races: calendar2026.races.map((race) => ({ ...race, season: 2027 })),
}

export const calendar2027Shifted = {
  season: 2027,
  races: calendar2026.races.map((race) => ({
    ...race,
    season: 2027,
    sessions: race.sessions.map((session) => ({ ...session, startsAt: session.startsAt.replace(/^2026-/, '2027-') })),
  })),
}

export const pageOf = (all: SeasonResults, offset: number): SeasonResults => {
  const rows = all.races.flatMap((race) => race.rows.map((row) => ({ round: race.round, row })))
  const races: Array<{ round: number; rows: Array<ResultRow> }> = []

  for (const { round, row } of rows.slice(offset, offset + 100)) {
    const last = races.at(-1)

    if (last?.round === round) last.rows.push(row)
    else races.push({ round, rows: [row] })
  }

  return { total: rows.length, races }
}

const noResults: SeasonResults = { total: 0, races: [] }

export const fake: JolpicaClient['Service'] = {
  races: (season) => Effect.succeed(season === 'current' || season === 2026 ? calendar2026 : noRaces),
  lastResults: () => Effect.succeed(results),
  lastQualifying: () => Effect.succeed(qualifying),
  lastSprint: () => Effect.succeed(noSprint),
  driverStandings: (season) => Effect.succeed(season === 2026 ? drivers : null),
  constructorStandings: (season) => Effect.succeed(season === 2026 ? constructors : null),
  seasonResults: (season, offset) => Effect.succeed(season === 2026 ? pageOf(raceResults2026, offset) : noResults),
  seasonSprints: (season, offset) => Effect.succeed(season === 2026 ? pageOf(sprintResults2026, offset) : noResults),
}

export const fakeJolpica = (overrides: Partial<JolpicaClient['Service']> = {}) => Layer.succeed(JolpicaClient, { ...fake, ...overrides })
