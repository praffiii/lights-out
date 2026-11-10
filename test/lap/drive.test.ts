import { expect, it } from 'bun:test'

import { type Drive, LAP_PX, nextTurn, push, resume, seek, SETTLE, step, turnLaps, wrap } from '../../src/lap/drive.ts'

const at = (pos: number, mine = true): Drive => ({ pos, target: pos, mine, quiet: 0 })
const calm = { cruise: 0, holding: false, turns: [], settle: SETTLE }
const circle = (r: number) => Array.from({ length: 400 }, (_, i) => ({ u: i / 400, x: r * Math.cos((i / 400) * 2 * Math.PI), y: 0, z: r * Math.sin((i / 400) * 2 * Math.PI) }))

it('one lap of scroll moves the target one lap', () => expect(push(at(0.2), LAP_PX).target).toBeCloseTo(1.2))

it('a scroll takes the wheel', () => expect(push(at(0, false), 10).mine).toBe(true))

it('stops where the scroll stops, with no drift', () => {
  let d = push(at(0), 1400)

  for (let i = 0; i < 300; i++) d = step(d, 1 / 60, calm)

  const held = d.pos

  for (let i = 0; i < 300; i++) d = step(d, 1 / 60, calm)

  expect(held).toBeCloseTo(0.1, 4)
  expect(d.pos).toBeCloseTo(held, 9)
})

it('cruises only while auto', () => {
  expect(step(at(0, false), 1, { ...calm, cruise: 0.02 }).target).toBeCloseTo(0.02)
  expect(step(at(0, true), 1, { ...calm, cruise: 0.02 }).target).toBe(0)
})

it('never hands control back by itself', () => {
  let d = push(at(0), 10)

  for (let i = 0; i < 600; i++) d = step(d, 1 / 60, calm)

  expect(d.mine).toBe(true)
  expect(resume(d).mine).toBe(false)
})

it('settles onto a turn it stops near, but not while held', () => {
  const near = { ...at(0.5), target: 0.505, quiet: 1 }
  expect(step(near, 1 / 60, { ...calm, turns: [0.51] }).target).toBe(0.51)
  expect(step(near, 1 / 60, { ...calm, turns: [0.51], holding: true }).target).toBe(0.505)
  expect(step(near, 1 / 60, { ...calm, turns: [0.53] }).target).toBe(0.505)
})

it('glides the short way across the finish line', () => {
  expect(seek(at(0.98), 0.02).target).toBeCloseTo(1.02)
  expect(wrap(-0.01)).toBeCloseTo(0.99)
})

it('finds the next and previous turn around the lap', () => {
  expect(nextTurn(0.9, [0.1, 0.5], 1)).toBeCloseTo(0.2)
  expect(nextTurn(0.1, [0.1, 0.5], -1)).toBeCloseTo(-0.6)
})

it('jumps instantly when settle is infinite', () => expect(step(push(at(0), 1400), 1 / 60, { ...calm, settle: Infinity }).pos).toBeCloseTo(0.1))

it('places each turn at its nearest point on the line', () => expect(turnLaps([{ x: 0, z: 100 }, { x: -100, z: 0 }], circle(100))).toEqual([0.25, 0.5]))
