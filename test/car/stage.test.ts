import { expect, it } from 'bun:test'

import { END, stageAt, STOPS } from '../../src/car/stage.ts'

it('stops once per part', () => {
  expect(STOPS).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  expect(END).toBe(8)
})

it('starts assembled with nothing lit', () => expect(stageAt(0)).toMatchObject({ explode: 0, lit: null, from: null }))

it('lights part 01 when apart', () => expect(stageAt(1)).toMatchObject({ explode: 1, lit: 0, to: 0, blend: 1 }))

it('glides between parts 03 and 04', () => {
  const s = stageAt(3.4)

  expect(s).toMatchObject({ lit: 2, from: 2, to: 3 })
  expect(s.blend).toBeCloseTo(0.4)
})

it('ends on the tyres', () => expect(stageAt(8)).toMatchObject({ lit: 7, to: 7, blend: 1 }))

it('holds the tyres past the end', () => expect(stageAt(9)).toMatchObject({ explode: 1, lit: 7, to: 7, blend: 1 }))
