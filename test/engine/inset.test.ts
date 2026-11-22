import { expect, it } from 'bun:test'

import { INSETS, insetPoint, type InsetPoint } from '../../src/engine/inset.ts'

const square: ReadonlyArray<InsetPoint> = [
  [0, 0.2, 0.2],
  [0.25, 0.8, 0.2],
  [0.5, 0.8, 0.8],
  [0.75, 0.2, 0.8],
]

it('puts u = 0 on the first point', () => {
  expect(insetPoint(square, 0)).toEqual({ x: 0.2, y: 0.2 })
})

it('wraps u = 1 back to u = 0', () => {
  expect(insetPoint(square, 1)).toEqual(insetPoint(square, 0))
  expect(insetPoint(square, -0.25)).toEqual({ x: 0.2, y: 0.8 })
})

it('interpolates linearly across the seam at u = 0.999', () => {
  const p = insetPoint(square, 0.999)

  expect(p.x).toBeCloseTo(0.2, 4)
  expect(p.y).toBeGreaterThan(0.2)
  expect(p.y).toBeLessThan(0.8)
  expect(p.y).toBeCloseTo(0.2 + (0.8 - 0.2) * (0.001 / 0.25), 4)
})

it('exposes every modelled circuit inset', () => {
  expect(Object.keys(INSETS).sort()).toEqual(['albert_park', 'interlagos', 'losail', 'miami', 'monza', 'vegas', 'yas_marina'])
})
