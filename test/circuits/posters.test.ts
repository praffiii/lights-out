import { expect, it } from 'bun:test'

import { allCircuits } from '../../src/circuits/registry.ts'

const KB = 1024

it('ships every poster as a full and a 1440 px WebP within budget', async () => {
  for (const { model } of allCircuits()) {
    for (const theme of ['light', 'dark']) {
      const full = Bun.file(`public/circuits/${model}-${theme}.webp`)
      const half = Bun.file(`public/circuits/${model}-${theme}-1440.webp`)

      expect(await full.exists()).toBe(true)
      expect(await half.exists()).toBe(true)
      expect(full.size).toBeLessThan(700 * KB)
      expect(half.size).toBeLessThan(250 * KB)
    }
  }
})
