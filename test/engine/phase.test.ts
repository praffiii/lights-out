import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { batteryAt, firstFrame, gearWord, PART_IDS, phaseAt, rawPhase, readouts, runPeak, STATES } from '../../src/engine/phase.ts'
import { PoleLapJson, type PoleLap, type PoleRow } from '../../src/pole/schema.ts'

const monza = Schema.decodeUnknownSync(PoleLapJson)(await Bun.file('test/fixtures/pole/monza.json').text())

const makeLap = (rows: ReadonlyArray<PoleRow>): PoleLap => ({
  sessionKey: 1,
  year: 2026,
  driver: 'Test Driver',
  team: 'Test Team',
  date: '2026-09-05T14:00:00Z',
  wet: false,
  time: rows.at(-1)?.[0] ?? 10,
  sectors: [3, 3, 4],
  rows,
})

const rising: ReadonlyArray<PoleRow> = Array.from({ length: 31 }, (_, i) => [i * 0.1, i / 30, 260 + i * 2, 7, 100, 0, 11000] as const)

const fadeRows: ReadonlyArray<PoleRow> = [
  ...Array.from({ length: 21 }, (_, i) => [i * 0.1, i / 50, 300 + i * 2, 8, 100, 0, 11600] as const),
  ...Array.from({ length: 10 }, (_, i) => [2.1 + i * 0.1, (21 + i) / 50, 338, 8, 100, 0, 11500] as const),
  ...Array.from({ length: 10 }, (_, i) => [3.1 + i * 0.1, (31 + i) / 50, 337, 8, 100, 0, 11400] as const),
]

const mixedRows: ReadonlyArray<PoleRow> = [
  ...Array.from({ length: 20 }, (_, i) => [i * 0.1, i / 80, 300 + i, 8, 100, 0, 11200] as const),
  ...Array.from({ length: 20 }, (_, i) => [2.0 + i * 0.1, (20 + i) / 80, 300 - i * 8, 6, 0, 100, 10500] as const),
  ...Array.from({ length: 20 }, (_, i) => [4.0 + i * 0.1, (40 + i) / 80, 150 + i * 2, 4, 55, 0, 9800] as const),
]

const blipRows: ReadonlyArray<PoleRow> = [
  ...Array.from({ length: 50 }, (_, i) => [i * 0.1, i / 70, 280 + i, 8, 100, 0, 11400] as const),
  [5.0, 50 / 70, 329, 8, 0, 100, 11300],
  [5.1, 51 / 70, 328, 8, 0, 100, 11300],
  [5.2, 52 / 70, 328, 8, 0, 100, 11300],
  ...Array.from({ length: 18 }, (_, i) => [5.3 + i * 0.1, (53 + i) / 70, 330 + i, 8, 100, 0, 11400] as const),
]

it('full throttle with speed rising is push', () => {
  expect(phaseAt(makeLap(rising), 2)).toBe('push')
})

it('full throttle 3 km/h under the run peak is fade, 2 km/h is not', () => {
  const lap = makeLap(fadeRows)

  expect(runPeak(lap, 2.5)).toBe(340)
  expect(rawPhase(lap, 2.5)).toBe('push')
  expect(phaseAt(lap, 2.5)).toBe('push')
  expect(rawPhase(lap, 3.5)).toBe('fade')
  expect(phaseAt(lap, 3.5)).toBe('fade')
})

it('brake on is brake, part throttle is part', () => {
  const lap = makeLap(mixedRows)

  expect(phaseAt(lap, 1.0)).toBe('push')
  expect(phaseAt(lap, 2.6)).toBe('brake')
  expect(phaseAt(lap, 4.6)).toBe('part')
})

it('a raw phase shorter than 0.3 s does not show', () => {
  expect(phaseAt(makeLap(blipRows), 5.2)).toBe('push')
})

it('scrubbing backwards gives the same phase as forwards', () => {
  const ts = Array.from({ length: 800 }, (_, i) => i * 0.1)

  expect(ts.map((t) => phaseAt(monza, t))).toEqual([...ts].reverse().map((t) => phaseAt(monza, t)).reverse())
})

it('the Monza first frame is the fade before T1', () => {
  const f = firstFrame(monza)

  expect(f.headline).toBe('Flat out, and slowing.')
  expect(f.t).toBeCloseTo(6.027, 2)
  expect(readouts(monza, f.t)).toMatchObject({
    speed: '338 km/h',
    peak: 'Peak 342 · throttle 100%',
    rpm: '11,595 rpm',
    gear: 'Gear 8 · limit 15,000',
    phase: 'fade',
  })
  expect(batteryAt(monza, f.t)).toBeLessThanOrEqual(0.35)
})

it('a lap with no fade starts on its first push with the short headline', () => {
  const lap = makeLap(rising)
  const f = firstFrame(lap)

  expect(f.headline).toBe('Flat out.')
  expect(f.t).toBe(0)
})

it('the battery falls in push, rises in brake, holds in part, stays in 0.05–1', () => {
  const lap = makeLap(mixedRows)
  const b0 = batteryAt(lap, 0)
  const bPush = batteryAt(lap, 1.8)
  const bBrake = batteryAt(lap, 3.8)
  const bPart1 = batteryAt(lap, 4.5)
  const bPart2 = batteryAt(lap, 5.5)

  expect(b0).toBe(0.5)
  expect(bPush).toBeLessThan(b0)
  expect(bBrake).toBeGreaterThan(bPush)
  expect(bPart2).toBeCloseTo(bPart1, 6)

  for (let t = 0; t <= monza.time; t += 0.5) {
    const b = batteryAt(monza, t)

    expect(b).toBeGreaterThanOrEqual(0.05)
    expect(b).toBeLessThanOrEqual(1)
  }
})

it('the fade sentence names the gear and every phase has all five parts', () => {
  expect(STATES.fade.sentence.replace('{gear}', gearWord(8))).toBe('Flat out in eighth. The only push left before the brakes.')

  for (const phase of ['push', 'fade', 'brake', 'part'] as const) {
    expect(Object.keys(STATES[phase].states)).toEqual([...PART_IDS])
  }
})
