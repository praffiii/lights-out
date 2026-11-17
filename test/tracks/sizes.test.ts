import { expect, it } from 'bun:test'
import { statSync } from 'node:fs'

import { CALENDAR } from '../../src/circuits/calendar.ts'
import SIZES from '../../src/tracks/sizes.json'

const LAYOUTS = ['desk', 'phone'] as const

it('has a base and 23 patches per layout, within budget', () => {
  for (const layout of LAYOUTS) {
    expect(statSync(`public/circuits/sizes/${layout}.webp`).size).toBeLessThan(400_000)
    expect(Object.keys(SIZES[layout].cells)).toEqual(Object.values(CALENDAR).map((c) => c.tile))

    for (const tile of Object.keys(SIZES[layout].cells)) expect(statSync(`public/circuits/sizes/${layout}-${tile}.webp`).size).toBeLessThan(40_000)
  }
})

it('keeps every patch inside its base image', () => {
  for (const layout of LAYOUTS) {
    const { w, h, cells } = SIZES[layout]

    for (const { patch } of Object.values(cells)) {
      const [x = -1, y = -1, pw = 0, ph = 0] = patch

      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(x + pw).toBeLessThanOrEqual(w)
      expect(y + ph).toBeLessThanOrEqual(h)
    }
  }
})
