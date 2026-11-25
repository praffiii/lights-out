import type { Titles } from './schema.ts'

const RACE = { drivers: 25, teams: 43 } as const

const SPRINT = { drivers: 8, teams: 15 } as const

const SIDES = { drivers: 0, teams: 1 } as const

type Which = keyof typeof SIDES

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
