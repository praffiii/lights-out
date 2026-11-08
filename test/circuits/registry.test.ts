import { expect, it } from 'bun:test'

import { circuitFor } from '../../src/circuits/registry.ts'
import { calendar2026 } from '../season/fake-jolpica.ts'

it('has a model for every race from today to the end of the season', () => {
  const missing = calendar2026.races.filter((race) => race.round >= 20 && !circuitFor(race.circuit.circuitId)).map((race) => race.circuit.circuitId)

  expect(missing).toEqual([])
})

it('has a model for the 2027 opener at Albert Park', () => {
  expect(circuitFor('albert_park')?.model).toBe('au-1953')
})
