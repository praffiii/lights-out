import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { circuitFor } from '../../src/circuits/registry.ts'
import type { PoleLap, PoleRow } from '../../src/pole/schema.ts'
import { PoleLapJson } from '../../src/pole/schema.ts'
import { braking, payoff } from '../../src/tracks/braking.ts'

const read = async (id: string) => Schema.decodeUnknownSync(PoleLapJson)(await Bun.file(`test/fixtures/pole/${id}.json`).text())

const vegasLap = await read('vegas')
const yasLap = await read('yas_marina')
const losailLap = await read('losail')
const vegasTurns = circuitFor('vegas')?.laps ?? []

const lapOf = (rows: ReadonlyArray<PoleRow>, time: number): PoleLap => ({ sessionKey: 1, year: 2026, driver: 'Test Driver', wet: false, time, sectors: [1, 1, 1], rows })

it('finds six stops on the wet 2025 Las Vegas pole lap', () => {
  const b = braking(vegasLap, vegasTurns)

  expect(b?.zones.length).toBe(6)
  expect(b?.brakingSeconds).toBeCloseTo(20.4, 1)
  expect(b?.flatSeconds).toBeCloseTo(51.5, 1)
  expect(Math.round((b?.flatShare ?? 0) * 100)).toBe(48)
})

it('names the biggest stop: into Turn 14 at the end of the Strip, 327 down to 69', () => {
  const b = braking(vegasLap, vegasTurns)

  expect(b?.biggest).toMatchObject({ turn: 14, entry: 327, min: 69, metres: 240 })
  expect(b?.biggest.seconds).toBeCloseTo(5.36, 2)
})

it('finds the longest run without braking, Turn 12 to Turn 14', () => {
  const b = braking(vegasLap, vegasTurns)

  expect(b?.longestRun).toMatchObject({ from: 12, to: 14 })
  expect(b?.longestRun.seconds).toBeCloseTo(23.6, 1)
})

it('finds seven stops on the 2025 Lusail pole lap, the biggest into Turn 6', () => {
  const b = braking(losailLap, circuitFor('losail')?.laps ?? [])

  expect(b?.zones.map((z) => z.turn)).toEqual([1, 2, 4, 6, 7, 10, 16])
  expect(b?.biggest).toMatchObject({ turn: 6, entry: 250, min: 99, metres: 90 })
  expect(b?.longestRun).toMatchObject({ from: 10, to: 16 })
  expect(b?.flatSeconds.toFixed(1)).toBe('54.1')
})

it('rounds the payoff from the flat-out time the stat shows, so 51.5 s reads 52', () => {
  const b = braking(vegasLap, vegasTurns)

  expect(b?.flatSeconds.toFixed(1)).toBe('51.5')
  expect(b ? payoff(b) : '').toBe('20 seconds a lap on the brakes, 52 flat out.')
})

it('names the Turn 1 stop that starts before the line', () => {
  expect(braking(vegasLap, vegasTurns)?.zones[0]?.turn).toBe(1)
})

it('joins taps under half a second apart and drops blips under 0.3 s', () => {
  const rows: ReadonlyArray<PoleRow> = [
    [0, 0.1, 300, 8, 100, 0],
    [1, 0.2, 300, 8, 100, 100],
    [1.2, 0.21, 250, 7, 0, 0],
    [1.6, 0.22, 200, 6, 0, 100],
    [2, 0.23, 150, 5, 0, 0],
    [3, 0.3, 160, 5, 100, 0],
    [4, 0.6, 250, 7, 100, 100],
    [4.2, 0.61, 240, 7, 100, 0],
    [5, 0.7, 260, 7, 100, 0],
    [6, 0.8, 280, 8, 100, 0],
  ]

  const b = braking(lapOf(rows, 6), [
    { turn: 1, u: 0.25 },
    { turn: 2, u: 0.65 },
  ])

  expect(b?.zones.length).toBe(1)
  expect(b?.zones[0]).toMatchObject({ turn: 1, entry: 300, min: 150 })
  expect(b?.zones[0]?.seconds).toBeCloseTo(1, 5)
})

it('reads a dry lap too', () => {
  const b = braking(yasLap, circuitFor('yas_marina')?.laps ?? [])

  expect(b?.zones.length).toBe(6)
  expect(Math.round((b?.flatShare ?? 0) * 100)).toBe(66)
})

it('finds six stops on the 2025 Yas Marina pole lap, the biggest into Turn 6', () => {
  const b = braking(yasLap, circuitFor('yas_marina')?.laps ?? [])

  expect(b?.zones.map((z) => z.turn)).toEqual([1, 5, 6, 9, 12, 16])
  expect(b?.biggest).toMatchObject({ turn: 6, entry: 316, min: 68, metres: 130 })
  expect(b?.longestRun).toMatchObject({ from: 6, to: 9 })
  expect(b?.flatSeconds.toFixed(1)).toBe('54.2')
})

it('returns null for a lap with no braking', () => {
  const rows: ReadonlyArray<PoleRow> = [
    [0, 0, 300, 8, 100, 0],
    [1, 0.5, 300, 8, 100, 0],
    [2, 1, 300, 8, 100, 0],
  ]

  expect(braking(lapOf(rows, 2), [{ turn: 1, u: 0.2 }])).toBeNull()
})
