import { expect, it } from 'bun:test'

import { allCircuits, circuitFor } from '../../src/circuits/registry.ts'
import { calendar2026 } from '../season/fake-jolpica.ts'

it('has a model for every race from today to the end of the season', () => {
  const missing = calendar2026.races.filter((race) => race.round >= 20 && !circuitFor(race.circuit.circuitId)).map((race) => race.circuit.circuitId)

  expect(missing).toEqual([])
})

it('has a model for the 2027 opener at Albert Park', () => {
  expect(circuitFor('albert_park')?.model).toBe('au-1953')
})

it('gives every circuit a 400-point centreline that runs once round the lap', () => {
  for (const info of allCircuits()) {
    expect(info.line).toHaveLength(400)
    expect(info.line[0]?.u).toBe(0)
    expect(info.line.every((p, i, a) => i === 0 || p.u > (a[i - 1]?.u ?? 1))).toBe(true)
  }
})

it('gives every circuit a phone crop inside the poster', () => {
  for (const { crop } of allCircuits()) {
    expect(crop[0]).toBeGreaterThanOrEqual(0)
    expect(crop[2]).toBeLessThanOrEqual(1)
    expect(crop[2] - crop[0]).toBeGreaterThan(0.4)
  }
})
