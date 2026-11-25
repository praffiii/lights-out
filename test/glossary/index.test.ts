import { expect, it } from 'bun:test'

import { WORDS } from '../../src/chapter/words.ts'
import { ENTRIES, find, LETTERS } from '../../src/glossary/index.ts'

it('lists every word once, in alphabetical order', () => {
  expect(ENTRIES.length).toBe(Object.keys(WORDS).length)
  expect(new Set(ENTRIES.map((e) => e.key)).size).toBe(ENTRIES.length)
  expect(ENTRIES.map((e) => e.term)).toEqual(ENTRIES.map((e) => e.term).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })))
})

it('files each word under its first letter', () => {
  expect(ENTRIES.find((e) => e.key === 'undercut')?.letter).toBe('U')
  expect(LETTERS.length).toBe(26)
  expect(ENTRIES.every((e) => LETTERS.includes(e.letter))).toBe(true)
})

it('sends a word to the first chapter that teaches it', () => {
  expect(ENTRIES.find((e) => e.key === 'undercut')?.chapter.n).toBe('03')
  expect(ENTRIES.find((e) => e.key === 'activeAero')?.chapter.n).toBe('02')
  expect(ENTRIES.find((e) => e.key === 'brakingZone')?.chapter.n).toBe('02')
  expect(ENTRIES.find((e) => e.key === 'trackLimits')?.chapter.n).toBe('04')
  expect(ENTRIES.map((e) => [String(e.key), e.chapter.n])).toContainEqual(['switchback', '07'])
  expect(ENTRIES.map((e) => [String(e.key), e.chapter.n])).toContainEqual(['budgetCap', '08'])
  expect(ENTRIES.map((e) => [String(e.key), e.chapter.n])).toContainEqual(['mainPlane', '09'])
})

it('finds words by term or meaning, ignoring case, accents and stray spaces', () => {
  expect(find('  Undercut ').map((e) => e.key)).toContain('undercut')
  expect(find('parc ferme').map((e) => e.key)).toEqual(['parcFerme'])
  expect(find('closed park').map((e) => e.key)).toEqual(['parcFerme'])
  expect(find('')).toBe(ENTRIES)
})

it('treats the query as plain text', () => {
  expect(find('.*')).toEqual([])
  expect(() => find('(')).not.toThrow()
})
