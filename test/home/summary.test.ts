import { expect, it } from 'bun:test'

import { CHAPTERS } from '../../src/home/content.ts'
import { CHAPTER_SUMMARY, countWord, MINUTES } from '../../src/home/summary.ts'

it('sums the guide up from its chapters', () => {
  expect(CHAPTER_SUMMARY).toBe('Nine chapters · 52 min')
  expect(MINUTES).toBe(52)
})

it('spells small counts and prints big ones', () => {
  expect(countWord(9)).toBe('Nine')
  expect(countWord(11)).toBe('11')
})

it('gives every chapter one full line', () => {
  for (const c of CHAPTERS) expect(c.line).toMatch(/^[A-Z].*\.$/)
})
