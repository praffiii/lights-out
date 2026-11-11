import type { Format } from './page-model.ts'

export type Day = { day: string; line: string; sessions: ReadonlyArray<{ name: string; length: string }> }

const SUNDAY: Day = { day: 'Sun.', line: 'The race pays the points.', sessions: [{ name: 'Formation lap', length: '1 lap' }, { name: 'Race', length: 'Up to 2 h' }] }

export const DAYS: Record<Format, ReadonlyArray<Day>> = {
  standard: [
    { day: 'Fri.', line: 'Practice. Nothing counts yet.', sessions: [{ name: 'Practice 1', length: '60 min' }, { name: 'Practice 2', length: '60 min' }] },
    { day: 'Sat.', line: 'One lap decides where you start.', sessions: [{ name: 'Practice 3', length: '60 min' }, { name: 'Qualifying', length: 'About 1 h' }] },
    SUNDAY,
  ],
  sprint: [
    { day: 'Fri.', line: 'Practice, then the sprint grid.', sessions: [{ name: 'Practice 1', length: '60 min' }, { name: 'Sprint qualifying', length: 'About 45 min' }] },
    { day: 'Sat.', line: 'A short race, then the long grid.', sessions: [{ name: 'Sprint', length: '100 km' }, { name: 'Qualifying', length: 'About 1 h' }] },
    SUNDAY,
  ],
}

export const FOOTNOTE: Record<Format, string> = {
  standard: 'Sprint weekends keep one practice. Friday adds sprint qualifying, Saturday a 100 km sprint before qualifying.',
  sprint: 'Six weekends a year. Parc fermé opens after the sprint, then locks again for qualifying.',
}

export const KNOCKOUT = [
  { n: 22, label: 'Q1 · 18 min · Slowest six out', key: 'q1' },
  { n: 16, label: 'Q2 · 15 min · Slowest six out', key: 'q2' },
  { n: 10, label: 'Q3 · 13 min · Fastest takes', key: 'pole' },
] as const

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const
