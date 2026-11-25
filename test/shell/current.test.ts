import { expect, it } from 'bun:test'

import { currentEntry } from '../../src/shell/current.ts'

it('finds the menu entry for a page', () => {
  expect(currentEntry('/')).toBe(0)
  expect(currentEntry('/chapters')).toBe(1)
  expect(currentEntry('/chapters/')).toBe(1)
  expect(currentEntry('/glossary/')).toBe(7)
})

it('puts a chapter under How F1 works, unless it has its own entry', () => {
  expect(currentEntry('/chapters/tyres-and-strategy')).toBe(1)
  expect(currentEntry('/chapters/inside-the-car')).toBe(3)
})

it('falls back to Home', () => {
  expect(currentEntry('/tracks/vegas')).toBe(0)
})
