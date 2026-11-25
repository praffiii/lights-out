import { expect, it } from 'bun:test'

import { linearPace, stepPace, timeAt } from '../../src/chapter/pace.ts'
import { scrubOptions } from '../../src/chapter/scrub-options.ts'

it('defaults to +=300%, resting at the end, and reading the bar on the pace', () => {
  const pace = linearPace(8)

  expect(scrubOptions(8, pace)).toEqual({ length: '+=300%', rest: 8, initial: 0, scale: pace })
})

it('uses a custom pin length and rest time when provided', () => {
  const pace = linearPace(81.786)

  expect(scrubOptions(81.786, pace, { length: '+=500%', rest: 6.027 })).toEqual({ length: '+=500%', rest: 6.027, initial: 6.027, scale: pace })
})

it('reads the bar on its own scale while the scroll keeps the pace', () => {
  const pace = stepPace([12.92, 46.47, 89.87, 91.93], 96)
  const { scale } = scrubOptions(96, pace, { scale: linearPace(96) })

  expect(timeAt(scale, 0.5)).toBe(48)
  expect(timeAt(pace, 0.6)).toBeCloseTo(89.87, 9)
})
