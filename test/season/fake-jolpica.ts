import { Effect, Layer, Schema } from 'effect'

import { JolpicaClient } from '../../src/season/jolpica-client.ts'
import {
  ConstructorStandingsResponse,
  DriverStandingsResponse,
  QualifyingResponse,
  RaceResultsResponse,
  RacesResponse,
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

export const calendar2027 = {
  season: 2027,
  races: calendar2026.races.map((race) => ({ ...race, season: 2027 })),
}

export const fake: JolpicaClient['Service'] = {
  races: (season) => Effect.succeed(season === 'current' || season === 2026 ? calendar2026 : noRaces),
  lastResults: () => Effect.succeed(results),
  lastQualifying: () => Effect.succeed(qualifying),
  lastSprint: () => Effect.succeed(noSprint),
  driverStandings: (season) => Effect.succeed(season === 2026 ? drivers : null),
  constructorStandings: (season) => Effect.succeed(season === 2026 ? constructors : null),
}

export const fakeJolpica = (overrides: Partial<JolpicaClient['Service']> = {}) => Layer.succeed(JolpicaClient, { ...fake, ...overrides })
