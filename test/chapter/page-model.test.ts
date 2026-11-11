import { afterAll, beforeAll, expect, it } from 'bun:test'
import { Schema } from 'effect'

import { chapterLive } from '../../src/chapter/page-model.ts'
import type { Race } from '../../src/season/jolpica-schema.ts'
import { type SeasonSnapshot, SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'

const zone = process.env.TZ

beforeAll(() => {
  process.env.TZ = 'UTC'
})

afterAll(() => {
  process.env.TZ = zone
})

const fixture = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot.json').text())

const live = (iso: string, snapshot: SeasonSnapshot = fixture, visitor = 'Asia/Jakarta') => chapterLive(snapshot, new Date(iso), visitor)

const unconfirm = (snapshot: SeasonSnapshot, round: number): SeasonSnapshot => ({
  ...snapshot,
  calendar: snapshot.calendar.map((race): Race => (race.round === round ? { ...race, sessions: race.sessions.map((s) => ({ ...s, timeConfirmed: false })) } : race)),
})

const qualifiedAt = (snapshot: SeasonSnapshot, round: number, raceName: string): SeasonSnapshot => {
  const { latest } = snapshot

  if (!latest?.qualifying) throw new Error('the fixture has a qualifying')

  return { ...snapshot, latest: { ...latest, qualifying: { ...latest.qualifying, race: { season: 2026, round, raceName } } } }
}

it('names this weekend with the visitor days when they differ', () => {
  expect(live('2026-11-06T15:00:00Z').weekend).toBe('This weekend · São Paulo GP · Fri–Sun at the track, Fri–Mon your time')
})

it('reads Las Vegas as Thursday to Saturday at the track', () => {
  expect(live('2026-11-15T00:00:00Z').weekend).toBe('Next · Las Vegas GP · Thu–Sat at the track, Fri–Sun your time')
  expect(live('2026-11-15T00:00:00Z', fixture, 'America/Los_Angeles').weekend).toBe('Next · Las Vegas GP · Thu–Sat')
})

it('reads days in UTC for unconfirmed sessions', () => {
  expect(live('2026-11-15T00:00:00Z', unconfirm(fixture, 21)).weekend).toBe('Next · Las Vegas GP · Fri–Sun')
})

it('names the last race once the season is over', () => {
  expect(live('2026-12-20T00:00:00Z').weekend).toMatch(/^Last race · Abu Dhabi GP · /)
})

it('defaults to the sprint format on a sprint weekend', () => {
  expect(live('2026-10-09T00:00:00Z').format).toBe('sprint')
  expect(live('2026-11-06T15:00:00Z').format).toBe('standard')
})

it('follows the latest qualifying circuit when it has a model', () => {
  expect(live('2026-11-15T00:00:00Z', qualifiedAt(fixture, 20, 'São Paulo Grand Prix')).circuit?.id).toBe('interlagos')
})

it('falls back to the weekend circuit, then the latest modelled one raced', () => {
  expect(live('2026-11-06T15:00:00Z').circuit?.id).toBe('interlagos')
  expect(live('2026-10-09T00:00:00Z').circuit?.id).toBe('albert_park')
})

it('writes the knockout and pole lines from the latest qualifying', () => {
  expect(live('2026-11-06T15:00:00Z').knockout).toEqual({ q1: null, q2: 'Mexico City GP · out: COL PIA BOR BEA SAI ALB', pole: 'Mexico City GP · pole: HAM 1:16.514' })
})

it('drops a knockout line whose group is not six', () => {
  expect(live('2026-11-06T15:00:00Z').knockout.q1).toBeNull()
})

it('puts the latest race top ten under the ladder', () => {
  expect(live('2026-11-06T15:00:00Z').ladder).toEqual({ caption: 'Scored at the Mexico City GP', codes: ['VER', 'HAM', 'ANT', 'LEC', 'NOR', 'RUS', 'LAW', 'BOR', 'HAD', 'HIR'] })
})

it('leaves every data line out with no latest results', () => {
  const bare = live('2026-11-06T15:00:00Z', { ...fixture, latest: null })

  expect(bare.knockout).toEqual({ q1: null, q2: null, pole: null })
  expect(bare.ladder).toBeNull()
})
