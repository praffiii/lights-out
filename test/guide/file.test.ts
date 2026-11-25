import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { RaceFile } from '../../src/guide/schema.ts'
import { VEGAS } from '../../src/guide/vegas.ts'

it('holds the Las Vegas facts', () => {
  expect(VEGAS).toEqual({
    session: 11420,
    race: 'Las Vegas',
    date: '2026-11-21',
    laps: 50,
    winner: 'Verstappen',
    first: 'Verstappen',
    pass: { by: 'Russell', on: 'Verstappen', lap: 2 },
    penalty: { driver: 'Hamilton', lap: 12, seconds: 10 },
    safetyCar: 19,
    stops: 16,
    overtake: 26,
    trap: { driver: 'Leclerc', lap: 39, kmh: 330 },
  })
})

it('rejects a file with a fact missing', () => {
  const { trap, ...rest } = VEGAS

  expect(trap.kmh).toBe(330)
  expect(() => Schema.decodeUnknownSync(RaceFile)(rest)).toThrow()
})
