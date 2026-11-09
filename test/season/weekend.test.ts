import { afterEach, expect, it } from 'bun:test'
import { Effect } from 'effect'

import { boxCopy, boxState, countdown, nextLightsOut, pickRace, sessionDay, when } from '../../src/season/weekend.ts'
import type { SeasonSnapshot } from '../../src/season/snapshot-schema.ts'
import { calendar2026 } from './fake-jolpica.ts'
import { snapshotAt } from './snapshot.ts'

const albertPark2027 = calendar2026.races
  .filter((race) => race.round === 1)
  .map((race) => ({
    ...race,
    season: 2027,
    sessions: race.sessions.map((session) => ({ ...session, startsAt: session.startsAt.replace('2026-', '2027-') })),
  }))

const pick = async (iso: string, overrides: Parameters<typeof snapshotAt>[1] = {}) => pickRace(await snapshotAt(iso, overrides), new Date(iso))

it('picks this weekend from Friday practice to Sunday night', async () => {
  const picked = await pick('2026-11-06T15:00:00Z')

  expect(picked?.race.circuit.circuitId).toBe('interlagos')
  expect(picked?.kind).toBe('this-weekend')
  expect([picked?.round, picked?.of]).toEqual([20, 23])
})

it('opens the weekend 48 hours before first practice', async () => {
  expect((await pick('2026-11-04T16:00:00Z'))?.kind).toBe('this-weekend')
  expect((await pick('2026-11-04T15:00:00Z'))?.kind).toBe('next')
})

it('moves to the next race four hours after the flag', async () => {
  const picked = await pick('2026-11-08T22:00:00Z')

  expect(picked?.race.circuit.circuitId).toBe('vegas')
  expect(picked?.kind).toBe('next')
  expect(picked?.round).toBe(21)
})

it('shows the finale when the season is over and 2027 is unpublished', async () => {
  const picked = await pick('2026-12-20T00:00:00Z')

  expect(picked?.race.circuit.circuitId).toBe('yas_marina')
  expect(picked?.kind).toBe('finale')
  expect([picked?.round, picked?.of]).toEqual([23, 23])
})

it('opens next season once its calendar exists', async () => {
  const picked = await pick('2026-12-20T00:00:00Z', {
    races: (season) => Effect.succeed(season === 2027 ? { season: 2027, races: albertPark2027 } : calendar2026),
  })

  expect(picked?.race.circuit.circuitId).toBe('albert_park')
  expect(picked?.kind).toBe('next')
  expect([picked?.round, picked?.of]).toEqual([1, 1])
})

const box = async (iso: string, patch: (s: SeasonSnapshot) => SeasonSnapshot = (s) => s) => boxState(patch(await snapshotAt(iso)), new Date(iso))

const brazilWon = (s: SeasonSnapshot): SeasonSnapshot =>
  s.latest ? { ...s, latest: { ...s.latest, race: { ...s.latest.race, race: { season: 2026, round: 20, raceName: 'Brazilian Grand Prix' } } } } : s

const tbc = (name: string) => (s: SeasonSnapshot): SeasonSnapshot => ({
  ...s,
  calendar: s.calendar.map((race) =>
    race.round === 20
      ? { ...race, sessions: race.sessions.map((session) => (session.name === name ? { ...session, startsAt: `${session.startsAt.slice(0, 10)}T00:00:00Z`, timeConfirmed: false } : session)) }
      : race,
  ),
})

const zone = process.env.TZ

afterEach(() => {
  process.env.TZ = zone
})

it('counts down to the next session inside the weekend', async () => {
  const state = await box('2026-11-07T12:30:00Z')

  expect(state).toEqual({ kind: 'before', gp: 'São Paulo GP', session: 'FP3', inMs: 7_200_000, confirmed: true })
  expect(boxCopy(state)).toEqual([{ value: 'São Paulo GP' }, { label: 'Practice 3 in', value: '02:00:00' }])
})

it('is live with time left during a session', async () => {
  const state = await box('2026-11-07T14:48:48Z')

  expect(state).toEqual({ kind: 'live', gp: 'São Paulo GP', session: 'FP3', leftMs: 2_472_000 })
  expect(boxCopy(state)).toEqual([{ value: 'São Paulo GP' }, { label: 'Practice 3', value: '41:12 left' }])
})

it('shows the winner after the race once results are in', async () => {
  const state = await box('2026-11-08T19:30:00Z', brazilWon)

  expect(state).toEqual({ kind: 'after', gp: 'São Paulo GP', session: 'Race', winner: 'Verstappen' })
  expect(boxCopy(state)).toEqual([{ value: 'São Paulo GP' }, { label: 'Race', value: 'P1 Verstappen' }])
  expect((await box('2026-11-08T19:30:00Z')).kind).not.toBe('after')
  expect((await box('2026-11-08T21:30:00Z', brazilWon)).kind).toBe('between')
})

it('stays on the countdown after practice', async () => {
  expect(await box('2026-11-06T16:45:00Z')).toEqual({ kind: 'before', gp: 'São Paulo GP', session: 'FP2', inMs: 8_100_000, confirmed: true })
})

it('is between weekends with whole days left', async () => {
  const state = await box('2026-11-10T10:00:00Z')

  expect(state).toEqual({ kind: 'between', gp: 'Las Vegas GP', days: 12 })
  expect(boxCopy(state)).toEqual([{ label: 'Next', value: 'Las Vegas GP' }, { label: 'in', value: '12 days' }])
})

it('says Time TBC for an unconfirmed session', async () => {
  const state = await box('2026-11-07T16:00:00Z', tbc('Qualifying'))

  expect(state).toEqual({ kind: 'before', gp: 'São Paulo GP', session: 'Qualifying', inMs: 0, confirmed: false })
  expect(boxCopy(state)).toEqual([{ value: 'São Paulo GP' }, { label: 'Qualifying', value: 'Time TBC' }])
})

it('is over when no next race exists', async () => {
  const state = await box('2026-12-20T00:00:00Z')

  expect(state).toEqual({ kind: 'over', season: 2026 })
  expect(boxCopy(state)).toEqual([{ value: '2026 season complete' }, { label: '2027 calendar', value: 'soon' }])
})

it("formats track time in the circuit's zone and your time in yours", () => {
  process.env.TZ = 'Asia/Jakarta'
  expect(when('2026-11-08T17:00:00Z', 'America/Sao_Paulo')).toEqual({ day: 'Sun 8 Nov', track: '14:00', yours: '00:00 (next day)' })

  process.env.TZ = 'America/Sao_Paulo'
  expect(when('2026-11-08T17:00:00Z', 'America/Sao_Paulo')).toEqual({ day: 'Sun 8 Nov', track: '14:00', yours: '14:00' })
})

it('is never live during the UTC midnight that stands in for an unconfirmed time', async () => {
  expect(await box('2026-11-07T00:30:00Z', tbc('Qualifying'))).toEqual({ kind: 'before', gp: 'São Paulo GP', session: 'FP3', inMs: 50_400_000, confirmed: true })
})

it('keeps the weekend open through the whole day of an unconfirmed race', async () => {
  const snapshot = tbc('Race')(await snapshotAt('2026-11-08T12:00:00Z'))

  expect(pickRace(snapshot, new Date('2026-11-08T12:00:00Z'))?.kind).toBe('this-weekend')
})

it('names the UTC day of an unconfirmed session, not the day before at the track', () => {
  expect(sessionDay({ name: 'Qualifying', startsAt: '2026-11-07T00:00:00Z', timeConfirmed: false }, 'America/Sao_Paulo')).toBe('Sat 7 Nov')
  expect(sessionDay({ name: 'Qualifying', startsAt: '2026-11-07T18:00:00Z', timeConfirmed: true }, 'America/Sao_Paulo')).toBe('Sat 7 Nov')
})

it('finds the next lights out across both calendars', async () => {
  const next = async (iso: string, overrides: Parameters<typeof snapshotAt>[1] = {}) => nextLightsOut(await snapshotAt(iso, overrides), new Date(iso))

  expect(await next('2026-11-06T15:00:00Z')).toMatchObject({ round: 20, of: 23, startsAt: '2026-11-08T17:00:00Z', confirmed: true })
  expect((await next('2026-11-08T17:00:01Z'))?.race.circuit.circuitId).toBe('vegas')
  expect(await next('2026-12-20T00:00:00Z')).toBeNull()
  expect(
    await next('2026-12-20T00:00:00Z', { races: (season) => Effect.succeed(season === 2027 ? { season: 2027, races: albertPark2027 } : calendar2026) }),
  ).toMatchObject({ round: 1, of: 1 })
})

it('splits a countdown into days, hours, minutes and seconds', () => {
  expect(countdown(((2 * 24 + 2) * 3600 + 5 * 60 + 9) * 1000)).toEqual([
    ['days', '02'],
    ['hrs', '02'],
    ['min', '05'],
    ['sec', '09'],
  ])
  expect(countdown(-5000).map(([, n]) => n)).toEqual(['00', '00', '00', '00'])
})

it('formats your time in the zone it is given', () => {
  process.env.TZ = 'UTC'
  expect(when('2026-11-08T17:00:00Z', 'America/Sao_Paulo', 'Asia/Jakarta')).toEqual({ day: 'Sun 8 Nov', track: '14:00', yours: '00:00 (next day)' })
})
