import { expect, it } from 'bun:test'

import { progressAt, timeAt } from '../../src/chapter/pace.ts'
import { frame, seasonPace, type Side, stripScale, total, won } from '../../src/titles/model.ts'
import { FALLBACK } from '../../src/titles/titles.ts'
import { round, season } from './small.ts'

const SEASON = { ...FALLBACK, rounds: FALLBACK.rounds.slice(0, 21) }

const summary = ({ lead, left, wonAt }: Side) => ({ lead, left, wonAt })

const top = (side: Side, n: number) => side.rows.slice(0, n).map((r) => [r.id, r.points, r.gain])

it('runs the two finish lines of 2026', () => {
  expect(summary(frame(SEASON, 17).drivers)).toEqual({ lead: 123, left: 125, wonAt: null })
  expect(summary(frame(SEASON, 18).drivers)).toEqual({ lead: 119, left: 100, wonAt: 18 })
  expect(summary(frame(SEASON, 18).teams)).toEqual({ lead: 126, left: 172, wonAt: null })
  expect(summary(frame(SEASON, 19).teams)).toEqual({ lead: 142, left: 129, wonAt: 19 })
  expect(summary(frame(SEASON, 20).drivers)).toMatchObject({ lead: 98, wonAt: 18 })
})

it('builds both tables of round 19', () => {
  const { drivers, teams, round: r } = frame(SEASON, 18)

  expect(r.locality).toBe('Mexico City')
  expect(top(drivers, 5)).toEqual([
    ['antonelli', 380, 15],
    ['max_verstappen', 261, 25],
    ['hamilton', 259, 18],
    ['russell', 250, 8],
    ['leclerc', 245, 12],
  ])
  expect(top(teams, 5)).toEqual([
    ['mercedes', 630, 23],
    ['ferrari', 504, 30],
    ['red_bull', 382, 27],
    ['mclaren', 365, 10],
    ['rb', 108, 6],
  ])
  expect(teams.rows.find((t) => t.id === 'red_bull')?.split.map((s) => s.points)).toEqual([261, 107, 14])
  expect(drivers.rows.map((row) => row.position)).toEqual(drivers.rows.map((_, i) => i + 1))
  expect(drivers.rows.every((row) => row.split.length === 0)).toBe(true)
})

it('ends on the latest tables and clamps the index', () => {
  const last = frame(SEASON, 99)

  expect(last.index).toBe(20)
  expect(top(last.drivers, 1)[0]?.slice(0, 2)).toEqual(['antonelli', 402])
  expect(top(last.teams, 1)[0]?.slice(0, 2)).toEqual(['mercedes', 666])
  expect(frame(SEASON, -3).index).toBe(0)
})

it('orders level points by wins, then by second places', () => {
  const wins = season([round(1, [['bob', 'red', 25], ['ann', 'blue', 25]], [['bob', 'red', 1], ['ann', 'blue', 2]])], 9)

  expect(frame(wins, 0).drivers.rows.map((r) => r.id)).toEqual(['bob', 'ann'])

  const seconds = season(
    [
      round(1, [['ann', 'red', 10], ['bob', 'blue', 10]], [['ann', 'red', 1], ['bob', 'blue', 2]]),
      round(2, [['ann', 'red', 10], ['bob', 'blue', 10]], [['bob', 'blue', 1], ['ann', 'red', 3]]),
    ],
    9,
  )

  expect(frame(seconds, 1).drivers.rows.map((r) => r.id)).toEqual(['bob', 'ann'])
})

it('lists a driver who finished without scoring, and a team the site does not know', () => {
  const t = season([round(1, [['ann', 'red', 25]], [['ann', 'red', 1], ['bob', 'blue', 12]])], 9)

  expect(frame(t, 0).drivers.rows.map((r) => [r.id, r.points])).toEqual([
    ['ann', 25],
    ['bob', 0],
  ])
  expect(frame(t, 0).teams.rows.map((r) => r.id)).toEqual(['red', 'blue'])
})

it('does not call a title won on a lead equal to the points left', () => {
  const t = season([round(1, [['ann', 'red', 25]], [['ann', 'red', 1]])], 1)

  expect(frame(t, 0).drivers).toMatchObject({ lead: 25, left: 25, wonAt: null })
})

it('settles the last race by countback', () => {
  const t = season([round(1, [['ann', 'red', 25], ['bob', 'blue', 25]], [['bob', 'blue', 1], ['ann', 'red', 2]])])

  expect(frame(t, 0).drivers).toMatchObject({ lead: 0, left: 0, wonAt: 0 })
  expect(frame(t, 0).drivers.rows[0]?.id).toBe('bob')
})

it('keeps a title won at the first round that settled it', () => {
  const t = season([round(1, [['ann', 'red', 60]]), round(2, [['ann', 'red', 26]]), round(3, [['bob', 'blue', 25]])], 1)

  expect(won(t).drivers).toBe(1)
  expect(frame(t, 2).drivers.wonAt).toBe(1)
  expect(frame(t, 0).drivers.wonAt).toBeNull()
})

it('paces the scroll so every round is reached and the last one holds', () => {
  const pace = seasonPace(SEASON)

  for (const [i, [p]] of pace.entries()) expect(p).toBeGreaterThanOrEqual(pace[i - 1]?.[0] ?? 0)
  expect(pace.at(-1)).toEqual([1, 20])

  for (let i = 0; i <= 20; i++) expect(Math.floor(timeAt(pace, progressAt(pace, i)) + 1e-6)).toBe(i)

  const held = (i: number) => progressAt(pace, i + 1) - progressAt(pace, i)

  expect(held(18) / held(5)).toBeCloseTo(2)
  expect(held(19) / held(5)).toBeGreaterThan(1.9)
  expect(timeAt(pace, 0.985)).toBe(20)
})

it('maps a pointer on the strip to the round under it, never past the last one', () => {
  expect(total(SEASON)).toBe(23)

  const at = (cell: number) => Math.floor(timeAt(stripScale(SEASON), (cell + 0.5) / total(SEASON)) + 1e-6)

  expect(at(0)).toBe(0)
  expect(at(18)).toBe(18)
  expect(at(20)).toBe(20)
  expect(at(22)).toBe(20)
})
