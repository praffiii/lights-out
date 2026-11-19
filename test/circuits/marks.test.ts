import { expect, it } from 'bun:test'

import pins from '../../src/circuits/pins/it-1922.json'

const KB = 1024

const near = (at: ReadonlyArray<number> | undefined, x: number, y: number) => at !== undefined && Math.abs((at[0] ?? 9) - x) < 0.003 && Math.abs((at[1] ?? 9) - y) < 0.003

const marks: Readonly<Record<string, ReadonlyArray<number> | undefined>> = { pole: pins['mark-pole'], 'grid-19': pins['mark-grid-19'] }

it('pins the Monza marks where the 2026 grid stood', () => {
  expect([near(marks.pole, 0.4231, 0.5719), near(marks['grid-19'], 0.3913, 0.5907)]).toEqual([true, true])
})

it('ships the marks as model nodes', async () => {
  const bytes = new DataView(await Bun.file('public/circuits/it-1922.glb').arrayBuffer())
  const length = bytes.getUint32(12, true)
  const json: { nodes: ReadonlyArray<{ name?: string }> } = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes.buffer, 20, length)))
  const names = json.nodes.map((n) => n.name)

  expect([names.includes('mark-pole'), names.includes('mark-grid-19')]).toEqual([true, true])
})

it('ships a label-free poster for a circuit with marks, within the poster budget', async () => {
  const full = Bun.file('public/circuits/it-1922-bare.webp')
  const half = Bun.file('public/circuits/it-1922-bare-1440.webp')

  expect([await full.exists(), await half.exists()]).toEqual([true, true])
  expect(full.size).toBeLessThan(220 * KB)
  expect(half.size).toBeLessThan(90 * KB)
  expect([...new Bun.Glob('*-bare*.webp').scanSync('public/circuits')].sort()).toEqual(['it-1922-bare-1440.webp', 'it-1922-bare.webp'])
})
