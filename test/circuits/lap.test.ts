import { expect, it } from 'bun:test'

import { lapProfile } from '../../src/circuits/lap.ts'
import { circuitFor } from '../../src/circuits/registry.ts'

const found = circuitFor('interlagos')

if (!found) throw new Error('registry has no Interlagos')

const interlagos = found

const circle = (r: number) => Array.from({ length: 400 }, (_, i) => ({ u: i / 400, x: r * Math.cos((i / 400) * 2 * Math.PI), y: 0, z: r * Math.sin((i / 400) * 2 * Math.PI) }))

it('laps a circle at the grip-limited speed', () => {
  const { seconds } = lapProfile(circle(100), 1)
  expect(seconds).toBeCloseTo((2 * Math.PI * 100) / Math.sqrt(44 * 100), 0)
})

it('caps a huge circle at the top speed', () => {
  const { seconds } = lapProfile(circle(10000), 1)
  expect(seconds).toBeCloseTo((2 * Math.PI * 10000) / 92, 0)
})

it('moves forward through the whole lap', () => {
  const { uAt } = lapProfile(interlagos.line, 1)
  const us = Array.from({ length: 50 }, (_, i) => uAt(i / 50))
  expect(us[0]).toBe(0)
  expect(us.every((u, i) => i === 0 || u > (us[i - 1] ?? 1))).toBe(true)
})

it('laps Interlagos in a believable time', () => {
  const { seconds } = lapProfile(interlagos.line, 1)
  expect(seconds).toBeGreaterThan(55)
  expect(seconds).toBeLessThan(80)
})
