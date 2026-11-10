import { expect, it } from 'bun:test'

import { allCircuits } from '../../src/circuits/registry.ts'

const KB = 1024

const BUDGETS = [
  ['.webp', 220],
  ['-1440.webp', 90],
  ['-map.webp', 450],
  ['-map-2048.webp', 180],
  ['.glb', 800],
] as const

it('ships every circuit as a poster, a map and a model within budget', async () => {
  for (const { model } of allCircuits()) {
    for (const [suffix, kb] of BUDGETS) {
      const file = Bun.file(`public/circuits/${model}${suffix}`)

      expect(`${model}${suffix} ${await file.exists()}`).toBe(`${model}${suffix} true`)
      expect(file.size).toBeLessThan(kb * KB)
    }
  }
})

it('ships every model without baked images', async () => {
  for (const { model } of allCircuits()) {
    const bytes = new DataView(await Bun.file(`public/circuits/${model}.glb`).arrayBuffer())
    const length = bytes.getUint32(12, true)
    const json: { images?: ReadonlyArray<object> } = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes.buffer, 20, length)))

    expect(json.images).toBeUndefined()
  }
})

it('leaves no themed poster behind', async () => {
  const left = [...new Bun.Glob('*-{light,dark}*.webp').scanSync('public/circuits')]

  expect(left).toEqual([])
})
