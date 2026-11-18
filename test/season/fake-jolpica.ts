import { Effect, Layer, Schema } from 'effect'

import { JolpicaClient, JolpicaError } from '../../src/season/jolpica-client.ts'
import {
  ConstructorStandingsResponse,
  DriverPolesResponse,
  type DriverRaces,
  DriverResultsResponse,
  DriverSprintsResponse,
  DriverStandingsResponse,
  QualifyingResponse,
  RaceResultsResponse,
  RacesResponse,
  type SeasonResults,
  SeasonQualifyingResponse,
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

export const pageOf = <Row, R extends { round: number; rows: ReadonlyArray<Row> }>(all: { total: number; races: ReadonlyArray<R> }, offset: number) => {
  const flat = all.races.flatMap((race) => race.rows.map((row) => ({ race, row })))
  const races: Array<R> = []

  for (const { race, row } of flat.slice(offset, offset + 100)) {
    const last = races.at(-1)

    if (last?.round === race.round) races[races.length - 1] = { ...last, rows: [...last.rows, row] }
    else races.push({ ...race, rows: [row] })
  }

  return { total: flat.length, races }
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
  seasonQualifying: () => Effect.succeed({ total: 0, races: [] }),
  driverResults: (id) => missing(`/drivers/${id}/results`),
  driverSprints: (id) => missing(`/drivers/${id}/sprint`),
  driverPoles: (id) => missing(`/drivers/${id}/qualifying/1`),
}

export const fakeJolpica = (overrides: Partial<JolpicaClient['Service']> = {}) => Layer.succeed(JolpicaClient, { ...fake, ...overrides })

const people = (name: string) => fixture(`people/${name}`)

export const results2026r20 = Schema.decodeUnknownSync(SeasonResultsResponse)(await people('results-2026'))
export const sprints2026r20 = Schema.decodeUnknownSync(SeasonSprintsResponse)(await people('sprint-2026'))
export const qualifying2026r20 = Schema.decodeUnknownSync(SeasonQualifyingResponse)(await people('qualifying-2026'))
export const drivers2026r20 = Schema.decodeUnknownSync(DriverStandingsResponse)(await people('driverstandings-2026'))

const PAST_SEASONS = [2016, 2017, 2018, 2020, 2021, 2022, 2023, 2024, 2025]

const finals = new Map(await Promise.all(PAST_SEASONS.map(async (season) => [season, Schema.decodeUnknownSync(DriverStandingsResponse)(await people(`driverstandings-${season}`))] as const)))

export const standingsFor = (season: number) => finals.get(season) ?? null

const careers = new Map(
  await Promise.all(
    ['ocon', 'bearman', 'antonelli'].map(
      async (id) =>
        [
          id,
          {
            results: Schema.decodeUnknownSync(DriverResultsResponse)(await people(`${id}-results`)),
            sprints: Schema.decodeUnknownSync(DriverSprintsResponse)(await people(`${id}-sprint`)),
            poles: Schema.decodeUnknownSync(DriverPolesResponse)(await people(`${id}-poles`)),
          },
        ] as const,
    ),
  ),
)

export const driverFixture = (driverId: string) => careers.get(driverId) ?? null

const racesPage = (all: DriverRaces, offset: number): DriverRaces => ({ total: all.total, races: all.races.slice(offset, offset + 100) })

export const missing = (path: string) =>
  Schema.decodeUnknownEffect(SeasonResultsResponse)({}).pipe(
    Effect.flatMap(() => Effect.die('unreachable')),
    Effect.mapError((cause) => new JolpicaError({ path, cause })),
  )

const career = <A>(driverId: string, pick: (found: NonNullable<ReturnType<typeof driverFixture>>) => A) => {
  const found = driverFixture(driverId)

  return found ? Effect.succeed(pick(found)) : missing(`/drivers/${driverId}`)
}

export const peopleFake: JolpicaClient['Service'] = {
  ...fake,
  driverStandings: (season) => Effect.succeed(season === 2026 || season === 'current' ? drivers2026r20 : standingsFor(season)),
  seasonResults: (season, offset) => Effect.succeed(season === 2026 ? pageOf(results2026r20, offset) : noResults),
  seasonSprints: (season, offset) => Effect.succeed(season === 2026 ? pageOf(sprints2026r20, offset) : noResults),
  seasonQualifying: (season, offset) => Effect.succeed(season === 2026 ? pageOf(qualifying2026r20, offset) : { total: 0, races: [] }),
  driverResults: (id, offset) => career(id, (found) => racesPage(found.results, offset)),
  driverSprints: (id, offset) => career(id, (found) => racesPage(found.sprints, offset)),
  driverPoles: (id, offset) => career(id, (found) => ({ total: found.poles.total, seasons: offset === 0 ? found.poles.seasons : [] })),
}
