import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'
import { indexCells, indexFacts } from '../../src/tracks/index-model.ts'

const snapshot = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot.json').text())
const at = new Date('2026-11-06T15:00:00Z')

it('works out the hero facts from the calendar', () => {
  expect(indexFacts(snapshot)).toEqual({ count: 23, longest: { label: 'Spa', km: '7.004' }, shortest: { label: 'Monaco', km: '3.337' }, newest: { label: 'Madring', line: 'Madrid, 2026' } })
  expect(indexFacts(undefined).newest.line).toBe('2026')
})

it('lists 23 cells in calendar order with short names', () => {
  const cells = indexCells(snapshot, at)

  expect(cells.length).toBe(23)
  expect(cells[4]).toMatchObject({ round: 5, label: 'Montréal' })
  expect(cells.find((c) => c.id === 'vegas')).toMatchObject({ round: 21, to: '/tracks/vegas' })
  expect(cells.filter((c) => c.to !== null).map((c) => c.id)).toEqual(['vegas', 'losail'])
})

it("lights the menu's race and nothing else", () => {
  expect(indexCells(snapshot, at).filter((c) => c.lit).map((c) => c.id)).toEqual(['interlagos'])
  expect(indexCells(snapshot, new Date('2026-11-12T12:00:00Z')).filter((c) => c.lit).map((c) => c.id)).toEqual(['vegas'])
})

it('lights nothing with no snapshot or once the season is over', () => {
  expect(indexCells(undefined, at).some((c) => c.lit)).toBe(false)
  expect(indexCells(snapshot, new Date('2026-12-31T00:00:00Z')).some((c) => c.lit)).toBe(false)
})

it("lights nothing between seasons, even when next season's calendar is out", () => {
  const nextCalendar = snapshot.calendar.map((race) => ({ ...race, season: 2027, sessions: race.sessions.map((s) => ({ ...s, startsAt: s.startsAt.replace('2026-', '2027-') })) }))
  const between = { ...snapshot, nextCalendar }

  expect(indexCells(between, new Date('2026-12-20T00:00:00Z')).some((c) => c.lit)).toBe(false)
})
