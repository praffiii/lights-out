import { describe, expect, test } from 'bun:test'

import { brakeOnset, crossTime } from '#/pass/model.ts'
import type { PoleRow } from '#/pole/schema.ts'

const row = (t: number, u: number, brake = 0): PoleRow => [t, u, 300, 8, brake > 0 ? 0 : 100, brake]

describe('crossTime', () => {
  test('crossTime interpolates between samples', () => {
    const rows = [row(0, 0.5), row(1, 0.6)]

    expect(crossTime(rows, 0.55)).toBeCloseTo(0.5, 9)
    expect(crossTime(rows, 0.7)).toBeNull()
  })
})

describe('brakeOnset', () => {
  test('brakeOnset takes the midpoint of the first brake-on row', () => {
    const rows = [row(0.8, 1.04), row(1, 1.05), row(1.27, 1.06, 100), row(1.5, 1.065, 100)]
    const onset = brakeOnset(rows, 1, 1.075)

    expect(onset?.t).toBeCloseTo(1.135, 9)
    expect(onset?.u).toBeCloseTo(1.055, 9)
  })

  test('is null when the brake never comes on in range', () => {
    expect(brakeOnset([row(0, 1.01), row(1, 1.02)], 1, 1.075)).toBeNull()
  })
})
