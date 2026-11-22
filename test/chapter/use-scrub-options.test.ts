import { expect, it } from 'bun:test'

import { scrubOptions } from '../../src/chapter/useScrub.ts'

it('defaults to +=300% and resting at end when no options are passed', () => {
  expect(scrubOptions(8)).toEqual({ length: '+=300%', rest: 8, initial: 0 })
})

it('uses a custom pin length and rest time when provided', () => {
  expect(scrubOptions(81.786, { length: '+=500%', rest: 6.027 })).toEqual({ length: '+=500%', rest: 6.027, initial: 6.027 })
})
