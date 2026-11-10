import { expect, it } from 'bun:test'

import { circuitFor } from '../../src/circuits/registry.ts'
import { alignLap } from '../../src/pole/align.ts'
import type { PoleRow } from '../../src/pole/schema.ts'
import { poleOf } from '../season/fake-openf1.ts'

const FIVE = [
  ['vegas', 9854],
  ['interlagos', 11408],
  ['albert_park', 11230],
  ['losail', 9846],
  ['yas_marina', 9835],
] as const

const inputFor = (id: string, key: number, line = id) => {
  const pole = poleOf(key)
  const info = circuitFor(line)
  const time = pole?.result.find((r) => r.position === 1)?.duration ?? null
  const lap = pole?.laps.find((l) => l.lap_duration !== null && time !== null && Math.abs(l.lap_duration - time) < 0.01)

  if (!pole || !info || !lap?.date_start || lap.lap_duration === null || lap.duration_sector_1 === null || lap.duration_sector_2 === null) throw new Error(`no fixture for ${id}`)

  return {
    start: Date.parse(lap.date_start),
    time: lap.lap_duration,
    splits: [lap.duration_sector_1, lap.duration_sector_1 + lap.duration_sector_2] as const,
    car: pole.car,
    location: pole.location,
    line: info.line,
    cuts: info.cuts,
  }
}

const uAt = (rows: ReadonlyArray<PoleRow>, t: number) => {
  const i = rows.findIndex((row) => row[0] >= t)
  const b = rows[i]
  const a = rows[i - 1] ?? b

  if (!a || !b) throw new Error(`no row at ${t}`)

  return b[0] === a[0] ? b[1] : a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0])
}

const into = (cut: number, u0: number) => cut + Math.ceil(u0 - cut)

it.each(FIVE)('aligns the %s pole lap', (id, key) => {
  const input = inputFor(id, key)
  const aligned = alignLap(input)

  expect(aligned).not.toBeNull()
  expect(aligned?.miss ?? 1).toBeLessThanOrEqual(0.03)
  expect(aligned?.rows[0]?.[0]).toBe(0)
  expect(aligned?.rows.at(-1)?.[0]).toBe(input.time)
})

it.each(FIVE)('lands each split exactly on its sector cut on %s', (id, key) => {
  const input = inputFor(id, key)
  const rows = alignLap(input)?.rows ?? []
  const u0 = rows[0]?.[1] ?? 0

  expect(uAt(rows, input.splits[0])).toBeCloseTo(into(input.cuts[0], u0), 4)
  expect(uAt(rows, input.splits[1])).toBeCloseTo(into(input.cuts[1], u0), 4)
})

it.each(FIVE)('u is monotonic and spans exactly one lap on %s', (id, key) => {
  const rows = alignLap(inputFor(id, key))?.rows ?? []

  expect(rows.every((row, i) => i === 0 || row[1] >= (rows[i - 1]?.[1] ?? 0))).toBe(true)
  expect((rows.at(-1)?.[1] ?? 0) - (rows[0]?.[1] ?? 0)).toBeCloseTo(1, 3)
})

it('aligns a lap whose first location sample is 0.4 s after the lap start', () => {
  const input = inputFor('vegas', 9854)
  const late = { ...input, location: input.location.filter((s) => Date.parse(s.date) >= input.start + 400) }
  const rows = alignLap(late)?.rows ?? []

  expect(rows.length).toBeGreaterThan(0)
  expect(uAt(rows, input.splits[0])).toBeCloseTo(into(input.cuts[0], rows[0]?.[1] ?? 0), 4)
})

it('rejects a lap whose positions belong to another circuit', () => {
  expect(alignLap(inputFor('vegas', 9854, 'interlagos'))).toBeNull()
})
