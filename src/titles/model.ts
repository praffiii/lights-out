import type { Pace } from '../chapter/pace.ts'

import type { TitleRound, Titles } from './schema.ts'

const RACE = { drivers: 25, teams: 43 } as const

const SPRINT = { drivers: 8, teams: 15 } as const

const SIDES = { drivers: 0, teams: 1 } as const

type Which = keyof typeof SIDES

export type Row = { id: string; position: number; points: number; gain: number; split: ReadonlyArray<{ id: string; points: number }> }

export type Side = { rows: ReadonlyArray<Row>; lead: number; left: number; wonAt: number | null }

export type Frame = { index: number; round: TitleRound; drivers: Side; teams: Side }

export const pointsLeft = (titles: Titles, n: number) => {
  const ahead = [...titles.rounds.slice(n), ...titles.left]
  const sprints = ahead.filter((r) => r.sprint).length
  const of = (which: Which) => ahead.length * RACE[which] + sprints * SPRINT[which]

  return { drivers: of('drivers'), teams: of('teams') }
}

const countback = (a: ReadonlyArray<number>, b: ReadonlyArray<number>) => {
  for (let place = 1; place <= Math.max(0, ...a, ...b); place++) {
    const diff = b.filter((p) => p === place).length - a.filter((p) => p === place).length

    if (diff !== 0) return diff
  }

  return 0
}

const table = (titles: Titles, n: number, which: Which) => {
  const entries = new Map<string, { id: string; points: number; finishes: Array<number> }>()
  const side = SIDES[which]

  const of = (id: string) => {
    const entry = entries.get(id) ?? { id, points: 0, finishes: [] }

    entries.set(id, entry)

    return entry
  }

  for (const round of titles.rounds.slice(0, n)) {
    for (const row of round.rows) of(row[side]).points += row[2]

    for (const row of round.finishes) of(row[side]).finishes.push(row[2])
  }

  return [...entries.values()].sort((a, b) => b.points - a.points || countback(a.finishes, b.finishes) || a.id.localeCompare(b.id))
}

const gap = (rows: ReadonlyArray<{ points: number }>) => (rows[0]?.points ?? 0) - (rows[1]?.points ?? 0)

const settled = (titles: Titles, which: Which) => {
  const index = titles.rounds.findIndex((_, i) => {
    const left = pointsLeft(titles, i + 1)[which]

    return left === 0 || gap(table(titles, i + 1, which)) > left
  })

  return index < 0 ? null : index
}

export const won = (titles: Titles) => ({ drivers: settled(titles, 'drivers'), teams: settled(titles, 'teams') })

export const totals = (titles: Titles, n: number, which: Which): ReadonlyMap<string, number> => new Map(table(titles, n, which).map(({ id, points }) => [id, points]))

const splits = (titles: Titles, n: number) => {
  const teams = new Map<string, Map<string, number>>()

  for (const [driver, team, points] of titles.rounds.slice(0, n).flatMap((round) => round.rows)) {
    const of = teams.get(team) ?? new Map<string, number>()

    of.set(driver, (of.get(driver) ?? 0) + points)
    teams.set(team, of)
  }

  return teams
}

const sideOf = (titles: Titles, index: number, which: Which, wonAt: number | null): Side => {
  const n = index + 1
  const rows = table(titles, n, which)
  const gains = new Map<string, number>()
  const teams = which === 'teams' ? splits(titles, n) : null

  for (const row of titles.rounds[index]?.rows ?? []) gains.set(row[SIDES[which]], (gains.get(row[SIDES[which]]) ?? 0) + row[2])

  return {
    rows: rows.map(({ id, points }, i) => ({
      id,
      position: i + 1,
      points,
      gain: gains.get(id) ?? 0,
      split: [...(teams?.get(id) ?? [])].map(([driver, scored]) => ({ id: driver, points: scored })).sort((a, b) => b.points - a.points),
    })),
    lead: gap(rows),
    left: pointsLeft(titles, n)[which],
    wonAt: wonAt !== null && wonAt <= index ? wonAt : null,
  }
}

const NO_ROUND: TitleRound = { round: 0, name: '', locality: '', date: '', sprint: false, winner: '', rows: [], finishes: [] }

export const frame = (titles: Titles, index: number): Frame => {
  const i = Math.max(0, Math.min(titles.rounds.length - 1, index))
  const at = won(titles)

  return { index: i, round: titles.rounds[i] ?? NO_ROUND, drivers: sideOf(titles, i, 'drivers', at.drivers), teams: sideOf(titles, i, 'teams', at.teams) }
}

export const total = (titles: Titles) => titles.rounds.length + titles.left.length

export const seasonPace = (titles: Titles): Pace => {
  const at = won(titles)
  const weights = titles.rounds.map((_, i) => (i === at.drivers || i === at.teams ? 2 : 1))
  const all = weights.reduce((sum, w) => sum + w, 0)
  let spent = 0

  const knots = weights.map((w, i): readonly [number, number] => {
    const knot: readonly [number, number] = [spent / all, i]

    spent += w

    return knot
  })

  return [...knots, [1, titles.rounds.length - 1]]
}

export const stripScale = (titles: Titles): Pace => {
  const last = titles.rounds.length - 1

  return [
    [0, 0],
    [last / total(titles), last],
    [1, last],
  ]
}

export const teamAt = (titles: Titles, driver: string, index: number): string | null =>
  titles.rounds
    .slice(0, index + 1)
    .flatMap((round) => [...round.rows, ...round.finishes])
    .filter(([id]) => id === driver)
    .at(-1)?.[1] ?? null
