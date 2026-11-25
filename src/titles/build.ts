import { calendarCircuit } from '../circuits/calendar.ts'
import type { SeasonRace } from '../season/history.ts'
import type { ConstructorStandings, DriverStandings, Race, ResultRow } from '../season/jolpica-schema.ts'

import { totals, won } from './model.ts'
import type { TitleRound, Titles } from './schema.ts'

type Input = {
  season: number
  calendar: ReadonlyArray<Race>
  races: ReadonlyArray<SeasonRace>
  sprints: ReadonlyArray<SeasonRace>
  drivers: typeof DriverStandings.Type
  teams: typeof ConstructorStandings.Type
}

const rowsOf = (pages: ReadonlyArray<SeasonRace>, round: number) => pages.filter((page) => page.round === round).flatMap((page) => page.rows)

const hasSprint = (race: Race) => race.sessions.some((session) => session.name === 'Sprint')

const dayOf = (race: Race) => {
  const start = race.sessions.find((session) => session.name === 'Race')

  if (!start) return null

  const timeZone = start.timeConfirmed ? (calendarCircuit(race.circuit.circuitId)?.tz ?? 'UTC') : 'UTC'

  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(start.startsAt))
}

const scored = (rows: ReadonlyArray<ResultRow>) => {
  const sums = new Map<string, readonly [string, string, number]>()

  for (const { driver, constructor, points } of rows) {
    const key = `${driver.driverId}/${constructor.constructorId}`

    sums.set(key, [driver.driverId, constructor.constructorId, (sums.get(key)?.[2] ?? 0) + points])
  }

  return [...sums.values()].filter(([, , points]) => points > 0)
}

const roundOf = (race: Race, rows: ReadonlyArray<ResultRow>, sprints: ReadonlyArray<ResultRow>): TitleRound | null => {
  const winner = rows.find((row) => row.positionText === '1')
  const date = dayOf(race)

  if (!winner || date === null) return null

  return {
    round: race.round,
    name: race.raceName,
    locality: race.circuit.locality,
    date,
    sprint: hasSprint(race),
    winner: winner.driver.driverId,
    rows: scored([...sprints, ...rows]),
    finishes: rows.flatMap((row) => (/^\d+$/.test(row.positionText) ? [[row.driver.driverId, row.constructor.constructorId, row.position] as const] : [])),
  }
}

export const titlesOf = (season: number, calendar: ReadonlyArray<Race>, races: ReadonlyArray<SeasonRace>, sprints: ReadonlyArray<SeasonRace>): Titles | null => {
  if (calendar.some((race) => race.season !== season)) return null

  const rounds: Array<TitleRound> = []
  const left: Array<{ round: number; sprint: boolean }> = []
  const people = new Map<string, { code: string | null; family: string }>()
  const teams = new Map<string, { name: string }>()

  for (const race of [...calendar].sort((a, b) => a.round - b.round)) {
    const rows = rowsOf(races, race.round)
    const extra = rowsOf(sprints, race.round)
    const round = roundOf(race, rows, extra)

    if (!round) {
      left.push({ round: race.round, sprint: hasSprint(race) })
      continue
    }

    rounds.push(round)

    for (const { driver, constructor } of [...extra, ...rows]) {
      people.set(driver.driverId, { code: driver.code, family: driver.familyName })
      teams.set(constructor.constructorId, { name: constructor.name })
    }
  }

  return rounds.length > 0 ? { season, drivers: Object.fromEntries(people), teams: Object.fromEntries(teams), rounds, left } : null
}

const agree = (titles: Titles, which: 'drivers' | 'teams', round: number, rows: ReadonlyArray<{ id: string; points: number }>) => {
  const at = titles.rounds.findIndex((entry) => entry.round === round)
  const sums = totals(titles, at + 1, which)

  return at >= 0 && rows.every(({ id, points }) => points === (sums.get(id) ?? 0)) && rows.reduce((sum, row) => sum + row.points, 0) === [...sums.values()].reduce((sum, points) => sum + points, 0)
}

export const matches = (titles: Titles, drivers: typeof DriverStandings.Type, teams: typeof ConstructorStandings.Type) =>
  drivers !== null &&
  teams !== null &&
  drivers.season === titles.season &&
  teams.season === titles.season &&
  agree(
    titles,
    'drivers',
    drivers.round,
    drivers.rows.map((row) => ({ id: row.driver.driverId, points: row.points })),
  ) &&
  agree(
    titles,
    'teams',
    teams.round,
    teams.rows.map((row) => ({ id: row.constructor.constructorId, points: row.points })),
  )

export const nextTitles = ({ season, calendar, races, sprints, drivers, teams, previous }: Input & { previous: Titles | undefined }): Titles | undefined => {
  const built = titlesOf(season, calendar, races, sprints)

  if (!built || !matches(built, drivers, teams)) return previous

  if (previous?.season === season && built.rounds.length < previous.rounds.length) return previous

  const { drivers: first, teams: second } = won(built)

  return first !== null || second !== null ? built : previous
}
