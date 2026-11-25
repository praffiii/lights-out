import { expect, it } from 'bun:test'

import { matches, nextTitles, titlesOf } from '../../src/titles/build.ts'
import { pointsLeft, totals, won } from '../../src/titles/model.ts'
import { calendar2027 } from '../season/fake-jolpica.ts'
import { input2026, titles2026 } from './fixture.ts'

const short = (rounds: number) => titlesOf(2026, input2026.calendar, input2026.races.filter((race) => race.round <= rounds), input2026.sprints)

it('sums the sprint and the race of every scored round', () => {
  const t = titles2026()

  expect(t.rounds).toHaveLength(20)
  expect(t.left).toEqual([21, 22, 23].map((round) => ({ round, sprint: false })))
  expect(t.rounds[18]).toMatchObject({ round: 19, name: 'Mexico City Grand Prix', locality: 'Mexico City', date: '2026-11-01', sprint: false, winner: 'max_verstappen' })
  expect(t.rounds.filter((r) => r.sprint).map((r) => r.round)).toEqual([2, 4, 5, 9, 12, 17])
  expect(t.rounds[1]?.rows).toContainEqual(['antonelli', 'mercedes', 29])
  expect(t.rounds.flatMap((r) => r.rows).every(([, , points]) => points > 0)).toBe(true)
})

it('follows a driver who scores for two teams', () => {
  expect(new Set(titles2026().rounds.flatMap((r) => r.rows.filter(([driver]) => driver === 'lawson').map(([, team]) => team)))).toEqual(new Set(['rb', 'red_bull']))
})

it('dates a race by the day at the circuit', () => {
  const vegas = input2026.calendar.map((race) => (race.round === 20 ? { ...race, circuit: { ...race.circuit, circuitId: 'vegas' }, sessions: [{ name: 'Race' as const, startsAt: '2026-11-22T04:00:00Z', timeConfirmed: true }] } : race))

  expect(titlesOf(2026, vegas, input2026.races, input2026.sprints)?.rounds[19]?.date).toBe('2026-11-21')
})

it('agrees with the official tables', () => {
  expect(matches(titles2026(), input2026.drivers, input2026.teams)).toBe(true)
  expect(matches(titles2026(), null, input2026.teams)).toBe(false)
  expect(matches(titles2026(), input2026.drivers, null)).toBe(false)
})

it('finds the round each title was won', () => {
  const t = titles2026()

  expect(won(t)).toEqual({ drivers: 18, teams: 19 })
  expect(pointsLeft(t, 18)).toEqual({ drivers: 125, teams: 215 })
  expect(pointsLeft(t, 19)).toEqual({ drivers: 100, teams: 172 })
  expect(pointsLeft(t, 20)).toEqual({ drivers: 75, teams: 129 })
})

it('gives nothing without results or with another season on the calendar', () => {
  expect(titlesOf(2026, input2026.calendar, [], input2026.sprints)).toBeNull()
  expect(titlesOf(2026, calendar2027.races, input2026.races, input2026.sprints)).toBeNull()
})

it('ignores a sprint whose race has not run', () => {
  const t = short(16)

  expect(t?.rounds).toHaveLength(16)
  expect(t?.rounds.some((r) => r.round === 17)).toBe(false)
  expect(t?.left[0]).toEqual({ round: 17, sprint: true })
})

it('takes a trusted season with a title won, or more of the same one', () => {
  const fresh = nextTitles({ ...input2026, previous: undefined })

  expect(fresh?.rounds).toHaveLength(20)

  const previous = short(19)

  if (!previous) throw new Error('no short season')

  expect(nextTitles({ ...input2026, previous })?.rounds).toHaveLength(20)
})

it('keeps the previous titles whenever the new ones cannot be trusted', () => {
  const previous = titles2026()
  const { drivers } = input2026

  if (!drivers) throw new Error('no standings')

  const docked = { ...drivers, rows: drivers.rows.map((row, i) => (i === 0 ? { ...row, points: row.points - 1 } : row)) }

  const dockedTeam = input2026.teams && { ...input2026.teams, rows: input2026.teams.rows.map((row, i) => (i === 0 ? { ...row, points: row.points - 1 } : row)) }

  for (const change of [{ drivers: docked }, { drivers: { ...drivers, round: 21 } }, { calendar: calendar2027.races }, { races: [] }, { races: input2026.races.slice(0, 18) }, { teams: dockedTeam }])
    expect(nextTitles({ ...input2026, ...change, previous })).toBe(previous)
})

it('keeps last season until a title of the new one is won', () => {
  const last = { ...titles2026(), season: 2025 }
  const early = input2026.races.filter((race) => race.round <= 3)
  const t = titlesOf(2026, input2026.calendar, early, input2026.sprints)

  if (!t) throw new Error('no early season')

  const points = new Map<string, number>()
  const teams = new Map<string, number>()

  for (const [driver, team, n] of t.rounds.flatMap((r) => r.rows)) {
    points.set(driver, (points.get(driver) ?? 0) + n)
    teams.set(team, (teams.get(team) ?? 0) + n)
  }

  const drivers = input2026.drivers && { ...input2026.drivers, round: 3, rows: input2026.drivers.rows.map((row) => ({ ...row, points: points.get(row.driver.driverId) ?? 0 })) }
  const constructors = input2026.teams && { ...input2026.teams, round: 3, rows: input2026.teams.rows.map((row) => ({ ...row, points: teams.get(row.constructor.constructorId) ?? 0 })) }

  expect(matches(t, drivers, constructors)).toBe(true)
  expect(nextTitles({ ...input2026, races: early, drivers, teams: constructors, previous: last })).toBe(last)
  expect(nextTitles({ ...input2026, races: early, drivers, teams: constructors, previous: undefined })).toBeUndefined()
})

const agreeing = (races: typeof input2026.races, round: number) => {
  const t = titlesOf(2026, input2026.calendar, races, input2026.sprints)

  if (!t || !input2026.drivers || !input2026.teams) throw new Error('no season')

  const drivers = totals(t, t.rounds.length, 'drivers')
  const teams = totals(t, t.rounds.length, 'teams')

  return {
    drivers: { ...input2026.drivers, round, rows: input2026.drivers.rows.map((row) => ({ ...row, points: drivers.get(row.driver.driverId) ?? 0 })) },
    teams: { ...input2026.teams, round, rows: input2026.teams.rows.map((row) => ({ ...row, points: teams.get(row.constructor.constructorId) ?? 0 })) },
  }
}

it('never goes back to fewer rounds', () => {
  const previous = titles2026()
  const races = input2026.races.filter((race) => race.round <= 19)

  expect(nextTitles({ ...input2026, races, ...agreeing(races, 19), previous })).toBe(previous)
})

it('keeps the previous titles when a correction reopens the only one won', () => {
  const races = input2026.races.filter((race) => race.round <= 18)
  const previous = short(18)

  if (!previous) throw new Error('no short season')

  expect(won(previous)).toEqual({ drivers: null, teams: null })
  expect(nextTitles({ ...input2026, races, ...agreeing(races, 18), previous })).toBe(previous)
})
