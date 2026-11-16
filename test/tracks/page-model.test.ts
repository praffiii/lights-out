import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { isModelled } from '../../src/circuits/modelled.ts'
import { circuitFor } from '../../src/circuits/registry.ts'
import { SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'
import { heroLabel, liveRow, turnsWord } from '../../src/tracks/page-model.ts'
import { TRACK_PAGES } from '../../src/tracks/pages.ts'

const snapshot = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot.json').text())
const vegas = TRACK_PAGES.vegas

if (!vegas) throw new Error('Las Vegas has no page')

it('labels the hero with the round from the calendar', () => {
  expect(heroLabel('vegas', vegas, snapshot)).toBe('The tracks · Round 21 · United States')
  expect(heroLabel('vegas', vegas, undefined)).toBe('The tracks · United States')
})

it('adds the live row during race week, naming the champion who arrives', () => {
  expect(liveRow('vegas', snapshot, new Date('2026-11-19T12:00:00Z'))).toEqual({ year: 2026, line: 'Round 21, this weekend. Antonelli arrives as champion.' })
})

it('says next race when Las Vegas is next but its weekend has not opened', () => {
  expect(liveRow('vegas', snapshot, new Date('2026-11-12T12:00:00Z'))?.line).toBe('Round 21, next race. Antonelli arrives as champion.')
})

it('has no live row while another race is up, or once Las Vegas is run', () => {
  expect(liveRow('vegas', snapshot, new Date('2026-11-06T15:00:00Z'))).toBeNull()
  expect(liveRow('vegas', snapshot, new Date('2026-11-23T12:00:00Z'))).toBeNull()
  expect(liveRow('vegas', undefined, new Date('2026-11-19T12:00:00Z'))).toBeNull()
})

it('leaves out the champion while the title is open', () => {
  const standings = snapshot.driverStandings

  if (!standings) throw new Error('the fixture has no standings')

  const rows = standings.rows.map((row, i) => (i === 1 ? { ...row, points: (standings.rows[0]?.points ?? 0) - 1 } : row))
  const open = { ...snapshot, driverStandings: { ...standings, rows } }

  expect(liveRow('vegas', open, new Date('2026-11-19T12:00:00Z'))?.line).toBe('Round 21, this weekend.')
})

it('anchors every place tag to a turn the circuit has', () => {
  for (const [id, page] of Object.entries(TRACK_PAGES)) {
    const turns = new Set(circuitFor(id)?.pins.map((p) => p.turn))

    for (const place of page?.places ?? []) expect(turns.has(place.turn)).toBe(true)
  }
})

it('spells the turn count', () => {
  expect(turnsWord(17)).toBe('Seventeen')
})

it('only modelled circuits can have a page', () => {
  for (const id of Object.keys(TRACK_PAGES)) expect(isModelled(id)).toBe(true)
})
