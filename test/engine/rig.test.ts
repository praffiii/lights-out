import { expect, it } from 'bun:test'

import { PART_IDS } from '../../src/engine/phase.ts'
import { PARTS, rig } from '../../src/engine/rig.ts'

it('has pins in [0, 1] for exactly the five power-unit parts', () => {
  expect(Object.keys(rig.pins).sort()).toEqual([...PART_IDS].sort())

  for (const id of PART_IDS) {
    const [x, y] = rig.pins[id] ?? [-1, -1]

    expect(x).toBeGreaterThanOrEqual(0)
    expect(x).toBeLessThanOrEqual(1)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(y).toBeLessThanOrEqual(1)
  }
})

it('lists the five parts in order', () => {
  expect(PARTS.map((p) => p.id)).toEqual([...PART_IDS])
  expect(PARTS.map((p) => p.n)).toEqual(['01', '02', '03', '04', '05'])
})
