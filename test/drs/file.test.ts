import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import baked from '../../src/drs/miami.json'
import { GhostFile } from '../../src/drs/schema.ts'

const file = Schema.decodeUnknownSync(GhostFile)(baked)

const [on, off] = file.laps

const read = (lap: (typeof file.laps)[number], t: number) => {
  const i = Math.max(1, lap.rows.findIndex((r) => r[0] >= t))
  const a = lap.rows[i - 1]
  const b = lap.rows[i]

  if (!a || !b) throw new Error('outside the lap')

  const f = (t - a[0]) / (b[0] - a[0])

  return { u: a[1] + (b[1] - a[1]) * f, speed: a[2] + (b[2] - a[2]) * f }
}

it('carries laps 53 and 54 of Hamilton at Miami 2025', () => {
  expect(file).toMatchObject({ session: 10033, race: 'Miami', year: 2025, driver: { code: 'HAM', name: 'Lewis Hamilton', team: 'Ferrari' } })
  expect([on.lap, off.lap]).toEqual([53, 54])
  expect(on.gap).toBeLessThan(1)
  expect(off.gap).toBeGreaterThan(1)
})

it('puts both laps level at the line where the flap opens', () => {
  expect(file.open).toBeGreaterThan(0.72)
  expect(file.open).toBeLessThan(0.735)
  expect(read(on, 0).u).toBeCloseTo(file.open, 4)
  expect(read(off, 0).u).toBeCloseTo(file.open, 4)
  expect(Math.abs(read(on, 0).speed - 300)).toBeLessThan(1.5)
  expect(Math.abs(read(off, 0).speed - 300)).toBeLessThan(1.5)
})

it('ends with lap 53 about eighteen metres ahead', () => {
  const metres = (read(on, file.end).u - read(off, file.end).u) * file.lengthM

  expect(metres).toBeGreaterThan(17)
  expect(metres).toBeLessThan(21)
  expect(metres / (read(off, file.end).speed / 3.6)).toBeGreaterThan(0.17)
  expect(metres / (read(off, file.end).speed / 3.6)).toBeLessThan(0.23)
  expect(Math.abs(read(on, file.end).speed - 335)).toBeLessThan(2.5)
  expect(Math.abs(read(off, file.end).speed - 316)).toBeLessThan(2.5)
})

it('spans the straight from Turn 16 to Turn 17 with time always rising', () => {
  expect((file.to - file.from) * file.lengthM).toBeGreaterThan(1300)
  expect((file.to - file.from) * file.lengthM).toBeLessThan(1350)

  for (const lap of file.laps) {
    expect(lap.rows.every((r, i) => i === 0 || r[0] > (lap.rows[i - 1]?.[0] ?? Infinity))).toBe(true)
    expect(lap.rows[0]?.[0] ?? 0).toBeLessThan(-3)
    expect(lap.rows.at(-1)?.[0] ?? 0).toBeGreaterThan(file.end)
  }
})
