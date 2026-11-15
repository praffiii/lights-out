import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { nextRace } from '../../src/chapter/next-race.ts'
import { SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'

const fixture = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot.json').text())

it('the fixture week is Round 20, São Paulo, this weekend', () => {
  expect(nextRace(fixture, new Date('2026-11-06T15:00:00Z'))).toEqual({ round: 20, place: 'São Paulo', when: 'this weekend' })
})

it('between weekends it is the next race', () => {
  expect(nextRace(fixture, new Date('2026-11-12T12:00:00Z'))).toEqual({ round: 21, place: 'Las Vegas', when: 'next race' })
})

it('after the last race closes with no next calendar it falls back', () => {
  expect(nextRace({ ...fixture, nextCalendar: [] }, new Date('2026-12-20T00:00:00Z'))).toBeNull()
})

it('between seasons, Round 1 of the next calendar is the next race', () => {
  expect(nextRace({ ...fixture, calendar: [], nextCalendar: fixture.calendar }, new Date('2026-01-01T00:00:00Z'))).toEqual({ round: 1, place: 'Melbourne', when: 'next race' })
})

it('no snapshot falls back', () => {
  expect(nextRace(undefined, new Date())).toBeNull()
})
