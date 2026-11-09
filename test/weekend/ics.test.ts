import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { type SeasonSnapshot, SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'
import { weekendIcs } from '../../src/weekend/ics.ts'

const fixture = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot.json').text())

const now = new Date('2026-11-06T15:00:00Z')

const octets = (line: string) => new TextEncoder().encode(line).length

const roundTwenty = (change: (race: SeasonSnapshot['calendar'][number]) => SeasonSnapshot['calendar'][number]): SeasonSnapshot => ({
  ...fixture,
  calendar: fixture.calendar.map((race) => (race.round === 20 ? change(race) : race)),
})

it('writes the weekend as five events in an RFC 5545 calendar', () => {
  const ics = weekendIcs(fixture, now)

  if (!ics) throw new Error('the fixture has a weekend')

  const lines = ics.body.split('\r\n')

  expect(ics.filename).toBe('interlagos-2026.ics')
  expect(ics.body).toEndWith('END:VCALENDAR\r\n')
  expect(lines.slice(0, 3)).toEqual(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lights Out//Race weekend//EN'])
  expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(5)
  expect(lines.filter((line) => line === 'DTSTAMP:20261106T150000Z')).toHaveLength(5)
  expect(lines).toContain('UID:2026-20-FP1@lights-out')
  expect(lines).toContain('SUMMARY:São Paulo GP · Practice 1')
  expect(lines).toContain('DTSTART:20261108T170000Z')
  expect(lines).toContain('DURATION:PT2H0M')
})

it('writes a session whose time is not confirmed as an all-day event', () => {
  const ics = weekendIcs(
    roundTwenty((race) => ({ ...race, sessions: race.sessions.map((s) => (s.name === 'FP1' ? { ...s, timeConfirmed: false } : s)) })),
    now,
  )

  const lines = ics?.body.split('\r\n') ?? []

  expect(lines).toContain('DTSTART;VALUE=DATE:20261106')
  expect(lines).toContain('DTEND;VALUE=DATE:20261107')
})

it('escapes text and folds long lines without splitting a character', () => {
  const name = `${'X'.repeat(58)}, a;b`
  const ics = weekendIcs(roundTwenty((race) => ({ ...race, raceName: name, circuit: { ...race.circuit, circuitId: 'nowhere' } })), now)

  if (!ics) throw new Error('the fixture has a weekend')

  const lines = ics.body.split('\r\n')
  const summary = ics.body.replaceAll('\r\n ', '').split('\r\n').find((line) => line.startsWith('SUMMARY:'))

  expect(summary).toBe(`SUMMARY:${'X'.repeat(58)}\\, a\\;b · Practice 1`)
  expect(lines.every((line) => octets(line) <= 75)).toBe(true)
  expect(lines.some((line) => line.startsWith(' ·'))).toBe(true)
})
