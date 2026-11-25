import { expect, test } from 'bun:test'
import { statSync } from 'node:fs'

import { frameSrc, nearestLoaded, WING_FRAMES } from '#/drs/wing.ts'

const LIMIT = 500_000

const FRAMES = Array.from({ length: WING_FRAMES }, (_, i) => i)

test('a frame has a two-digit file name', () => {
  expect(frameSrc(3)).toBe('/wing/03.webp')
  expect(frameSrc(23)).toBe('/wing/23.webp')
})

test('the closest loaded frame stands in until the wanted one arrives', () => {
  expect(nearestLoaded(new Set(), 4)).toBeNull()
  expect(nearestLoaded(new Set([0, 23]), 4)).toBe(0)
  expect(nearestLoaded(new Set([0, 23]), 20)).toBe(23)
  expect(nearestLoaded(new Set([0, 4, 23]), 4)).toBe(4)
})

const sizeOf = async (i: number) => {
  const bytes = new Uint8Array(await Bun.file(`public${frameSrc(i)}`).arrayBuffer())
  const view = new DataView(bytes.buffer)

  expect(new TextDecoder().decode(bytes.slice(12, 16))).toBe('VP8 ')

  return [view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff]
}

test('all 24 frames are there, the same size and light', async () => {
  for (const i of FRAMES) expect(await sizeOf(i)).toEqual([784, 452])

  expect(FRAMES.reduce((sum, i) => sum + statSync(`public${frameSrc(i)}`).size, 0)).toBeLessThan(LIMIT)
})
