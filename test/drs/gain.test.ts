import { expect, it } from 'bun:test'

import { GAINS, median, pairs, type Pass } from '../../src/drs/gain.ts'

const open = (over: Partial<Pass> = {}): Pass => ({ driver: 1, lap: 10, gap: 0.8, open: 8, top: 340, ...over })

const shut = (over: Partial<Pass> = {}): Pass => ({ driver: 1, lap: 11, gap: 1.2, open: 0, top: 330, ...over })

it('pairs a lap just inside a second with one just outside', () => {
  expect(pairs([open(), shut()])).toEqual([10])
  expect(pairs([open(), shut({ lap: 13 }), shut({ lap: 7, top: 331 })])).toEqual([10, 9])
})

it('drops laps too far apart, other drivers and gaps outside the windows', () => {
  for (const other of [shut({ lap: 14 }), shut({ lap: 10 }), shut({ driver: 2 }), shut({ gap: 0.95 }), shut({ gap: 1.5 }), shut({ open: 1 })]) expect(pairs([open(), other])).toEqual([])

  for (const first of [open({ gap: 0.5 }), open({ gap: 1 }), open({ open: 5 })]) expect(pairs([first, shut()])).toEqual([])
})

it('takes the middle value', () => {
  expect(median([3, 1, 2])).toBe(2)
  expect(median([4, 1, 2, 3])).toBe(2.5)
  expect(median([])).toBe(0)
})

it('carries the four straights in order', () => {
  expect(GAINS.map((g) => [g.race, g.straight])).toEqual([
    ['Monza', 'Main straight'],
    ['Las Vegas', 'First zone'],
    ['Monza', 'Before Ascari'],
    ['Miami', 'The last long straight'],
  ])

  for (const [i, gain] of [8, 9, 10, 14].entries()) {
    expect(Math.abs((GAINS[i]?.gain ?? 0) - gain)).toBeLessThanOrEqual(1)
    expect(GAINS[i]?.pairs ?? 0).toBeGreaterThan(15)
  }
})
