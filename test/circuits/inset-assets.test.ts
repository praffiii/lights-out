import { expect, it } from 'bun:test'

import { MODELLED } from '../../src/circuits/modelled.ts'
import { INSETS } from '../../src/engine/inset.ts'

const KB = 1024

it('ships a label-free inset poster under 80 KB for every modelled circuit', async () => {
  for (const id of MODELLED) {
    const inset = INSETS[id]
    const file = Bun.file(`public${inset.src}`)

    expect(`${id} ${await file.exists()}`).toBe(`${id} true`)
    expect(file.size).toBeLessThan(80 * KB)
  }
})

it('ships a projected 2D racing line in [0, 1] for every modelled circuit', () => {
  for (const id of MODELLED) {
    const { line } = INSETS[id]

    expect(line.length).toBeGreaterThanOrEqual(200)
    expect(line.every(([, x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true)
  }
})
