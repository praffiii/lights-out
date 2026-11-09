import { expect, it } from 'bun:test'

import { FREE, fitCrop } from '../../src/circuits/fit.ts'
import { allCircuits, circuitFor } from '../../src/circuits/registry.ts'

const placed = (crop: readonly [number, number, number, number]) => {
  const { k, x, y } = fitCrop(crop)

  return [k * crop[0] + x, k * crop[1] + y, k * crop[2] + x, k * crop[3] + y]
}

it('fits every circuit inside the free area above the facts, never enlarged', () => {
  for (const { crop } of allCircuits()) {
    const [x0, y0, x1, y1] = placed(crop)

    expect(fitCrop(crop).k).toBeLessThanOrEqual(1)
    expect(x0).toBeGreaterThanOrEqual(FREE[0] - 1e-9)
    expect(y0).toBeGreaterThanOrEqual(FREE[1] - 1e-9)
    expect(x1).toBeLessThanOrEqual(FREE[2] + 1e-9)
    expect(y1).toBeLessThanOrEqual(FREE[3] + 1e-9)
  }
})

it('keeps Interlagos within a few percent of its approved size', () => {
  expect(fitCrop(circuitFor('interlagos')?.crop ?? [0, 0, 1, 1]).k).toBeGreaterThan(0.95)
})

it('shrinks Las Vegas to the height of the free area', () => {
  const crop = circuitFor('vegas')?.crop ?? [0, 0, 1, 1]
  const [, y0, , y1] = placed(crop)

  expect(fitCrop(crop).k).toBeLessThan(1)
  expect(y1 - y0).toBeCloseTo(FREE[3] - FREE[1], 9)
})
