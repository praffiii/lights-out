import { Effect } from 'effect'

import type { SeasonRace } from '../season/history.ts'
import { JolpicaClient, type JolpicaError } from '../season/jolpica-client.ts'
import type { DriverRaces, DriverStandings, ResultRow } from '../season/jolpica-schema.ts'

type Table = NonNullable<typeof DriverStandings.Type>

import { personFor } from './people.ts'
import type { Past, People, PersonRow } from './schema.ts'

export const PAST_BUDGET = 60

const NO_START = new Set(['Did not start', 'Withdrew', 'Withdrawn', 'Did not qualify', 'Did not prequalify'])

export const isStart = (row: { positionText: string; status: string }) => row.positionText !== 'W' && row.positionText !== 'F' && !NO_START.has(row.status)

const classified = (row: ResultRow) => /^\d+$/.test(row.positionText)

const all = <P extends { total: number }>(page: (offset: number) => Effect.Effect<P, JolpicaError>) =>
  Effect.gen(function* () {
    const pages: Array<P> = []
    let offset = 0
    let total = 1

    while (offset < total) {
      const next = yield* page(offset)

      pages.push(next)
      total = next.total
      offset += 100
    }

    return pages
  })

const pastOf = (
  driverId: string,
  through: number,
  results: ReadonlyArray<DriverRaces['races'][number]>,
  sprints: ReadonlyArray<DriverRaces['races'][number]>,
  poles: ReadonlyArray<number>,
  tables: ReadonlyMap<number, Table>,
): Past => {
  const mine = results.filter((race) => race.season <= through)
  const started = mine.filter((race) => isStart(race.row))
  const wins = started.filter((race) => classified(race.row) && race.row.position === 1)
  const seasons = [...new Set(started.map((race) => race.season))].sort((a, b) => a - b)
  const teams = new Map(started.map((race) => [race.row.constructor.constructorId, race.row.constructor.name]))
  const first = wins[0]

  return {
    through,
    starts: started.length,
    wins: wins.length,
    podiums: started.filter((race) => classified(race.row) && race.row.position <= 3).length,
    poles: poles.filter((season) => season <= through).length,
    points: [...mine, ...sprints.filter((race) => race.season <= through)].reduce((sum, race) => sum + race.row.points, 0),
    seasons,
    teams: [...teams].map(([constructorId, name]) => ({ constructorId, name })),
    firstWin: first ? { season: first.season, country: first.country } : null,
    finals: seasons.map((season) => ({ season, position: tables.get(season)?.rows.find((row) => row.driver.driverId === driverId)?.position ?? null })),
  }
}

const pointsOrder = (races: ReadonlyArray<SeasonRace>, sprints: ReadonlyArray<SeasonRace>) => {
  const points = new Map<string, number>()

  for (const row of [...races, ...sprints].flatMap((race) => race.rows)) points.set(row.driver.driverId, (points.get(row.driver.driverId) ?? 0) + row.points)

  return [...points].sort((a, b) => b[1] - a[1]).map(([driverId]) => driverId)
}

const mergeRounds = (races: ReadonlyArray<SeasonRace>) => {
  const rounds = new Map<number, SeasonRace>()

  for (const race of races) {
    const seen = rounds.get(race.round)

    rounds.set(race.round, seen ? { ...seen, rows: [...seen.rows, ...race.rows] } : race)
  }

  return [...rounds.values()].sort((a, b) => a.round - b.round)
}

const personRow = (round: number, row: ResultRow, qualified: number | null): PersonRow => ({
  round,
  grid: row.grid,
  position: row.position,
  positionText: row.positionText,
  points: row.points,
  constructorId: row.constructor.constructorId,
  qualified,
})

export const buildPeople = (
  season: number,
  pages: ReadonlyArray<SeasonRace>,
  sprints: ReadonlyArray<SeasonRace>,
  previous: People | undefined,
): Effect.Effect<People | undefined, never, JolpicaClient> =>
  Effect.gen(function* () {
    const races = mergeRounds(pages)
    const jolpica = yield* JolpicaClient
    const sessions = yield* all((offset) => jolpica.seasonQualifying(season, offset))
    const qualifying = new Map(sessions.flatMap((page) => page.races).flatMap(({ round, rows }) => rows.map((row) => [`${round} ${row.driverId}`, row.position] as const)))
    const through = season - 1
    const tables = new Map<number, Table>()
    const order = pointsOrder(races, sprints).filter((driverId) => personFor(driverId))
    const past: Record<string, Past> = Object.fromEntries(order.flatMap((driverId) => (previous?.past[driverId] ? [[driverId, previous.past[driverId]]] : [])))
    let used = 0

    const counted = <A>(effect: Effect.Effect<A, JolpicaError>) => Effect.suspend(() => ((used += 1), effect))

    const fetchPast = (driverId: string) =>
      Effect.gen(function* () {
        const results = (yield* all((offset) => counted(jolpica.driverResults(driverId, offset)))).flatMap((page) => page.races)
        const driverSprints = (yield* all((offset) => counted(jolpica.driverSprints(driverId, offset)))).flatMap((page) => page.races)
        const poles = (yield* all((offset) => counted(jolpica.driverPoles(driverId, offset)))).flatMap((page) => page.seasons)
        const seasons = new Set(results.filter((race) => race.season <= through && isStart(race.row)).map((race) => race.season))

        for (const year of seasons) {
          if (!tables.has(year)) {
            const table = yield* counted(jolpica.driverStandings(year))

            if (table) tables.set(year, table)
          }
        }

        return pastOf(driverId, through, results, driverSprints, poles, tables)
      })

    const fill = Effect.gen(function* () {
      for (const driverId of order) {
        if (past[driverId]?.through === through || used >= PAST_BUDGET) continue

        const built = yield* fetchPast(driverId).pipe(Effect.catch((error) => Effect.logWarning('driver career skipped', { driverId, path: error.path }).pipe(Effect.as(undefined))))

        if (built) past[driverId] = built
      }
    })

    yield* fill.pipe(
      Effect.timeout('90 seconds'),
      Effect.catch((error) => Effect.logWarning('driver careers cut short', error)),
    )

    const results: Record<string, Array<PersonRow>> = {}
    const sprintPoints: Record<string, number> = {}
    const born: Record<string, string> = {}

    for (const race of races) {
      for (const row of race.rows) {
        results[row.driver.driverId] = [...(results[row.driver.driverId] ?? []), personRow(race.round, row, qualifying.get(`${race.round} ${row.driver.driverId}`) ?? null)]

        if (row.driver.dateOfBirth !== undefined) born[row.driver.driverId] = row.driver.dateOfBirth
      }
    }

    for (const row of sprints.flatMap((race) => race.rows)) sprintPoints[row.driver.driverId] = (sprintPoints[row.driver.driverId] ?? 0) + row.points

    const people: People = {
      season,
      rounds: races.map((race) => ({ round: race.round, raceName: race.raceName, locality: race.locality, country: race.country })),
      results,
      sprintPoints,
      born,
      past,
    }

    return people
  }).pipe(Effect.catch((error) => Effect.logWarning('people kept from the previous snapshot', { path: error.path }).pipe(Effect.as(previous?.season === season ? previous : undefined))))
