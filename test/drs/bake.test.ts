import { expect, it } from 'bun:test'

import { ghostRows, lastOpen, matchLine, openingAt, type Sample } from '../../src/drs/bake.ts'

const run = (speeds: ReadonlyArray<number>, drs: ReadonlyArray<number> = []): Sample[] => speeds.map((speed, i) => ({ t: i, speed, drs: drs[i] ?? 0 }))

it('opens halfway between the last shut sample and the first open one', () => {
  expect(openingAt(run([1, 1, 1, 1], [0, 8, 14, 12]))).toBe(1.5)
})

it('never opens without an open sample', () => {
  expect(openingAt(run([1, 1, 1], [0, 8, 8]))).toBeNull()
  expect(lastOpen(run([1, 1, 1]))).toBeNull()
})

it('ends on the last open sample', () => {
  expect(lastOpen(run([1, 1, 1, 1], [0, 14, 12, 0]))).toBe(2)
})

it('turns speed into metres either side of the line', () => {
  const rows = ghostRows(run([360, 360, 360]), 1, 0.5, 5000)

  expect(rows.map(([t]) => t)).toEqual([-1, 0, 1])
  expect(rows[0]?.[1]).toBeCloseTo(0.48, 6)
  expect(rows[1]?.[1]).toBeCloseTo(0.5, 6)
  expect(rows[2]?.[1]).toBeCloseTo(0.52, 6)
})

it('finds the same distance on a slower lap, counted from the slowest point', () => {
  const fast = run([100, 36, 360, 360, 360])
  const slow = run([100, 36, 180, 180, 180, 180])


  const metres = (samples: ReadonlyArray<Sample>, to: number) => {
    let sum = 0

    for (let t = 1; t < to; t += 0.001) {
      const i = Math.min(samples.length - 2, Math.floor(t))
      const a = samples[i]?.speed ?? 0
      const b = samples[i + 1]?.speed ?? 0

      sum += ((a + (b - a) * (t - i)) / 3.6) * 0.001
    }

    return sum
  }

  expect(metres(slow, matchLine(fast, 3, slow))).toBeCloseTo(metres(fast, 3), 0)
})
