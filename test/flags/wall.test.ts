import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import type { FlagRace } from '../../src/flags/schema.ts'
import { count, races, wallOf } from '../../src/flags/wall.ts'
import { SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'

const fixture = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot.json').text())

const race = (circuit: string, samples: FlagRace['samples']): FlagRace => ({
  sessionKey: circuit.length,
  circuit,
  dateEnd: '2026-06-01T15:00:00+00:00',
  clear: 1,
  yellow: 0,
  doubleYellow: 0,
  blue: 0,
  red: 0,
  chequered: 1,
  blackWhite: 0,
  blackWhiteTrackLimits: 0,
  safetyCars: 0,
  vscs: 0,
  samples,
})

it('sums the season', () => {
  if (!fixture.flags) throw new Error('the fixture has a flag tally')

  expect(wallOf(fixture.flags)).toMatchObject({
    season: 2026,
    races: 20,
    first: 'Melbourne',
    latest: 'Interlagos',
    blue: 1287,
    red: 0,
    redSessions: 26,
    trackLimits: 17,
    blackWhite: 20,
    safetyCars: 15,
    scRaces: 10,
    vscs: 25,
    vscRaces: 14,
  })
})

it('quotes the most recent race that has the flag', () => {
  const older = race('Monte Carlo', { blue: { lap: 58, message: 'WAVED BLUE FLAG FOR CAR 14 (ALO)' }, clear: { lap: 3, message: 'CLEAR IN TRACK SECTOR 2' } })
  const newer = race('Interlagos', { clear: { lap: 8, message: 'CLEAR IN TRACK SECTOR 7' } })
  const wall = wallOf({ season: 2026, races: [older, newer], redSessions: 0 })

  expect(wall.quotes.blue).toEqual({ circuit: 'Monte Carlo', lap: 58, message: 'WAVED BLUE FLAG FOR CAR 14 (ALO)' })
  expect(wall.quotes.clear?.circuit).toBe('Interlagos')
  expect(wall.quotes.yellow).toBeUndefined()
})

it("the season in the copy is the tally's", () => {
  expect(wallOf({ season: 2025, races: [race('Yas Marina Circuit', {})], redSessions: 0 }).season).toBe(2025)
})

it('count groups thousands the British way', () => {
  expect(count(1287)).toBe('1,287')
})

it('one race reads as one race', () => {
  expect(races(1)).toBe('1 race')
  expect(races(20)).toBe('20 races')
})
