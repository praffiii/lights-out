import { expect, test } from 'bun:test'

import { linearPace, progressAt, stepPace, timeAt } from '#/chapter/pace.ts'

test('linear pace is the identity scaled to end', () => {
  const pace = linearPace(17)

  expect(timeAt(pace, 0)).toBe(0)
  expect(timeAt(pace, 0.5)).toBeCloseTo(8.5, 9)
  expect(timeAt(pace, 1)).toBe(17)
})

test('step pace gives each step an equal share of the scroll', () => {
  const pace = stepPace([10, 30, 120, 140], 160)

  expect(progressAt(pace, 30)).toBeCloseTo(0.4, 9)
  expect(timeAt(pace, 0.6)).toBeCloseTo(120, 9)
  expect(timeAt(pace, 0.5)).toBeCloseTo(75, 9)
})

test('progressAt inverts timeAt', () => {
  const pace = stepPace([15, 44.2, 105.8, 135.7], 165.7)

  for (const p of [0, 0.05, 0.2, 0.33, 0.5, 0.81, 1]) expect(progressAt(pace, timeAt(pace, p))).toBeCloseTo(p, 9)
})

test('times outside the replay clamp to its ends', () => {
  const pace = linearPace(10)

  expect(timeAt(pace, -1)).toBe(0)
  expect(progressAt(pace, 99)).toBe(1)
})
