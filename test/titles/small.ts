import type { TitleRound, Titles } from '../../src/titles/schema.ts'

type Score = readonly [string, string, number]

export const round = (n: number, rows: ReadonlyArray<Score>, finishes: ReadonlyArray<Score> = [], extra: Partial<TitleRound> = {}): TitleRound => ({
  round: n,
  name: `Race ${n}`,
  locality: `Place ${n}`,
  date: `2026-03-0${n}`,
  sprint: false,
  winner: rows[0]?.[0] ?? '',
  rows,
  finishes,
  ...extra,
})

export const season = (rounds: ReadonlyArray<TitleRound>, left = 0): Titles => ({
  season: 2026,
  drivers: {
    ann: { code: 'ANN', family: 'Ann' },
    bob: { code: null, family: 'Bob' },
    cat: { code: 'CAT', family: 'Cat' },
    dan: { code: 'DAN', family: 'Dan' },
    eve: { code: 'EVE', family: 'Eve' },
  },
  teams: { red: { name: 'Red Racing' }, blue: { name: 'Blue Racing' } },
  rounds,
  left: Array.from({ length: left }, (_, i) => ({ round: rounds.length + i + 1, sprint: false })),
})
