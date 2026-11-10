import { expect, it } from 'bun:test'

import { FREE, fitCrop, fitSpin } from '../../src/circuits/fit.ts'
import { allCircuits } from '../../src/circuits/registry.ts'

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

it('renders every circuit near full size, framed for the hero in Blender', () => {
  const small = allCircuits().flatMap(({ crop, name }) => (fitCrop(crop).k < 0.95 ? [name] : []))

  expect(small).toEqual([])
})

it('shrinks a crop taller than the free area to its height', () => {
  const crop = [0.2, 0.3, 0.9, 0.95] as const
  const [, y0, , y1] = placed(crop)

  expect(fitCrop(crop).k).toBeLessThan(1)
  expect(y1 - y0).toBeCloseTo(FREE[3] - FREE[1], 9)
})

it('spins a ground square seen at 36 degrees inside √2 of its resting size', () => {
  const cw = 0.3 * 1.6
  const ch = cw * Math.sin((36 * Math.PI) / 180)
  const { h } = fitSpin([0.2, 0.4, 0.5, 0.4 + ch], 1.6)

  expect(h).toBeCloseTo(0.86 * Math.min(1.6 / (Math.SQRT2 * cw), 1 / (Math.SQRT2 * ch)), 9)
})
