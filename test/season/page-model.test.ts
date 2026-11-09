import { expect, it } from 'bun:test'
import { Effect } from 'effect'

import { calendarHead, calendarTiles, weekend } from '../../src/season/page-model.ts'
import { words } from '../../src/season/words.ts'
import { calendar2026, calendar2027Shifted } from './fake-jolpica.ts'
import { snapshotAt } from './snapshot.ts'

const at = async (iso: string, overrides: Parameters<typeof snapshotAt>[1] = {}) => ({ snapshot: await snapshotAt(iso, overrides), now: new Date(iso) })

const head = async (iso: string, overrides: Parameters<typeof snapshotAt>[1] = {}) => {
  const { snapshot, now } = await at(iso, overrides)

  return calendarHead(snapshot, now)
}

const band = async (iso: string, overrides: Parameters<typeof snapshotAt>[1] = {}) => {
  const { snapshot, now } = await at(iso, overrides)

  return weekend(snapshot, now)
}

const withRound20 = (change: (race: (typeof calendar2026.races)[number]) => (typeof calendar2026.races)[number]) => ({
  races: () => Effect.succeed({ ...calendar2026, races: calendar2026.races.map((race) => (race.round === 20 ? change(race) : race)) }),
})

it('spells small numbers and leaves big ones as digits', () => {
  expect(words(23)).toBe('twenty-three')
  expect(words(1)).toBe('one')
  expect(words(20)).toBe('twenty')
  expect(words(31)).toBe('31')
})

it('marks done, now and upcoming rounds on the calendar', async () => {
  const { snapshot, now } = await at('2026-11-06T15:00:00Z')
  const tiles = calendarTiles(snapshot, now)
  const tile = (round: number) => tiles.find((entry) => entry.round === round)

  expect(tiles).toHaveLength(23)
  expect([tile(19)?.state, tile(19)?.status]).toEqual(['done', 'Done'])
  expect([tile(20)?.state, tile(20)?.status, tile(20)?.code]).toEqual(['now', 'Now', 'BRA'])
  expect([tile(21)?.state, tile(21)?.status]).toEqual(['upcoming', ''])
  expect(await head('2026-11-06T15:00:00Z')).toEqual({
    label: 'The calendar · 23 rounds',
    count: 'Round 20 of 23',
    headline: 'Twenty-three circuits. Nineteen done, one live.',
  })
})

it('keeps the race weekend live until four hours after the race starts', async () => {
  const { snapshot, now } = await at('2026-11-08T19:00:00Z')
  const tile = calendarTiles(snapshot, now).find((entry) => entry.round === 20)

  expect(tile?.state).toBe('now')
  expect((await head('2026-11-08T19:00:00Z')).headline).toBe('Twenty-three circuits. Nineteen done, one live.')
})

it('counts the rounds to go between weekends', async () => {
  expect(await head('2026-11-12T12:00:00Z')).toMatchObject({ count: 'Round 21 of 23', headline: 'Twenty-three circuits. Twenty done, three to go.' })
})

it('reads none done before the season starts', async () => {
  expect((await head('2026-03-01T00:00:00Z')).headline).toBe('Twenty-three circuits. None done yet.')
})

it('reads all done after the finale and points at next season', async () => {
  const next = { races: (season: number | 'current') => Effect.succeed(season === 2027 ? calendar2027Shifted : calendar2026) }

  expect(await head('2026-12-20T00:00:00Z', next)).toMatchObject({ count: 'Season complete', headline: 'Twenty-three circuits. All done.' })
  expect((await band('2026-12-20T00:00:00Z', next))?.label).toBe('Next race · 2027 · Round 1')
})

it('shows the last race as done when next season is not out', async () => {
  const last = await band('2026-12-20T00:00:00Z')

  expect(last?.label).toBe('Last race · Round 23')
  expect(last?.sessions.every((session) => session.status === 'Done')).toBe(true)
})

it('lays out this weekend with days in track time and the next session', async () => {
  const now = await band('2026-11-07T12:00:00Z')

  expect(now?.label).toBe('This weekend · Round 20')
  expect(now?.title).toBe('São Paulo Grand Prix.')
  expect(now?.facts?.name).toBe('Interlagos')
  expect(now?.sessions.map((session) => session.label)).toEqual(['Practice 1', 'Practice 2', 'Practice 3', 'Qualifying', 'Race'])
  expect(now?.sessions.map((session) => session.day)).toEqual(['Fri', 'Fri', 'Sat', 'Sat', 'Sun'])
  expect(now?.sessions.map((session) => session.status)).toEqual(['Done', 'Done', 'Next · 02h 30m', 'Later', 'Later'])
  expect(now?.sessions.map((session) => session.next)).toEqual([false, false, true, false, false])
})

it('counts days when the next session is more than a day away', async () => {
  expect((await band('2026-11-05T10:30:00Z'))?.sessions[0]?.status).toBe('Next · 1d 05h')
})

it('marks a session in progress as live and next', async () => {
  const live = (await band('2026-11-07T15:00:00Z'))?.sessions[2]

  expect([live?.status, live?.next]).toEqual(['Live', true])
})

it('reads Time TBC for an unconfirmed session', async () => {
  const unconfirmed = withRound20((race) => ({ ...race, sessions: race.sessions.map((session) => (session.name === 'Race' ? { ...session, timeConfirmed: false } : session)) }))

  expect((await band('2026-11-07T12:00:00Z', unconfirmed))?.sessions.at(-1)?.status).toBe('Time TBC')
})

it('names the next race between weekends', async () => {
  expect((await band('2026-11-12T12:00:00Z'))?.label).toBe('Next race · Round 21')
})

it('keeps the sessions of a circuit it has no facts for', async () => {
  const unknown = withRound20((race) => ({ ...race, circuit: { ...race.circuit, circuitId: 'nowhere' } }))
  const now = await band('2026-11-07T12:00:00Z', unknown)

  expect(now?.facts).toBeUndefined()
  expect(now?.sessions).toHaveLength(5)
})
