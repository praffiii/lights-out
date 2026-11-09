import type { DriverRef, ResultRow } from './jolpica-schema.ts'
import type { History, Leader, TeamPoints } from './snapshot-schema.ts'

export type SeasonRace = { round: number; rows: ReadonlyArray<ResultRow> }

const byRound = (races: ReadonlyArray<SeasonRace>) => {
  const rounds = new Map<number, Array<ResultRow>>()

  for (const race of races) rounds.set(race.round, [...(rounds.get(race.round) ?? []), ...race.rows])

  return rounds
}

type Tally = { driver: DriverRef; points: number; finishes: Array<number> }

const countback = (a: Tally, b: Tally) => {
  if (a.points !== b.points) return b.points - a.points

  for (let place = 1; place <= Math.max(...a.finishes, ...b.finishes, 1); place++) {
    const diff = b.finishes.filter((p) => p === place).length - a.finishes.filter((p) => p === place).length

    if (diff !== 0) return diff
  }

  return 0
}

export function seasonHistory(races: ReadonlyArray<SeasonRace>, sprints: ReadonlyArray<SeasonRace>): History {
  const raceRows = byRound(races)
  const sprintRows = byRound(sprints)
  const tally = new Map<string, Tally>()
  const teams = new Map<string, TeamPoints>()
  const leaders: Array<Leader> = []

  for (let round = 1; raceRows.has(round); round++) {
    const rows = raceRows.get(round) ?? []

    for (const row of [...rows, ...(sprintRows.get(round) ?? [])]) {
      const driver = tally.get(row.driver.driverId) ?? { driver: row.driver, points: 0, finishes: [] }
      const key = `${row.constructor.constructorId}/${row.driver.driverId}`
      const team = teams.get(key) ?? { constructorId: row.constructor.constructorId, driver: row.driver, points: 0 }

      tally.set(row.driver.driverId, { ...driver, points: driver.points + row.points })
      teams.set(key, { ...team, points: team.points + row.points })
    }

    for (const row of rows) tally.get(row.driver.driverId)?.finishes.push(row.position)

    const [first, second] = [...tally.values()].sort(countback)

    if (first) leaders.push({ round, driver: first.driver, lead: first.points - (second?.points ?? 0) })
  }

  return { round: leaders.at(-1)?.round ?? 0, leaders, teams: [...teams.values()] }
}
