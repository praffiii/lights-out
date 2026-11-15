import { expect, it } from 'bun:test'

import { PARTS, rig } from '../../src/car/parts.ts'

const moves = (offset: readonly [number, number, number]) => offset.some((v) => v !== 0)

it('the rig lists the eight parts in the chapter order', () => {
  expect(rig.parts.map((p) => p.id)).toEqual(PARTS.map((p) => p.id))
})

it('the survival cell anchors the explode and every other part moves', () => {
  const nodes = (id: string) => rig.nodes.filter((n) => n.part === id)

  expect(nodes('survivalCell').every((n) => !moves(n.offset))).toBe(true)

  for (const { id } of PARTS.filter((p) => p.id !== 'survivalCell')) expect(`${id} ${nodes(id).some((n) => moves(n.offset))}`).toBe(`${id} true`)
})

it('every flap is a node of a wing and opens flatter', () => {
  const names = new Set(rig.nodes.map((n) => n.name))

  expect(rig.flaps.length).toBeGreaterThanOrEqual(2)

  for (const flap of rig.flaps) {
    expect(names.has(flap.node)).toBe(true)
    expect(flap.angle).toBeLessThan(0)
  }
})

it('the engine cover lifts with the sidepods', () => {
  expect(rig.nodes.find((n) => n.name === 'sidepods_cover')?.part).toBe('sidepods')
})

it('every part has a tag on both exploded posters, inside the frame', () => {
  for (const pins of [rig.posters.exploded, rig.posters.explodedPhone]) {
    for (const { id } of PARTS) {
      const at = pins[id]

      expect(`${id} ${at !== undefined && at.every((v) => v > 0 && v < 1)}`).toBe(`${id} true`)
    }
  }
})

it('the top view dimension lines fall at the axles and the car width', () => {
  expect(rig.top.along).toEqual([0.25, 0.7984])
  expect(rig.top.across).toEqual([0.1605, 0.8395])
})

it("every inline term is a phrase of its part's job", () => {
  for (const part of PARTS) for (const term of part.terms) expect(`${part.id}: ${part.job.includes(term.text)}`).toBe(`${part.id}: true`)
})
