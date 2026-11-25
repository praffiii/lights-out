import { expect, it } from 'bun:test'

import { won } from '../../src/titles/model.ts'
import { FALLBACK, pickTitles } from '../../src/titles/titles.ts'
import { titles2026 } from './fixture.ts'

const cut = (rounds: number) => ({ ...FALLBACK, rounds: FALLBACK.rounds.slice(0, rounds) })

it('ships a 2026 season with both titles won', () => {
  expect(FALLBACK.season).toBe(2026)
  expect(FALLBACK.rounds.length).toBeGreaterThanOrEqual(21)
  expect(won(FALLBACK)).toEqual({ drivers: 18, teams: 19 })
  expect(FALLBACK.rounds.slice(0, 20)).toEqual([...titles2026().rounds])
})

it('prefers live data once it is as new as the shipped season', () => {
  const same = cut(FALLBACK.rounds.length)
  const later = { ...cut(3), season: 2027 }

  expect(pickTitles(same, FALLBACK)).toBe(same)
  expect(pickTitles(later, FALLBACK)).toBe(later)
})

it('falls back when live data is missing or older', () => {
  expect(pickTitles(undefined, FALLBACK)).toBe(FALLBACK)
  expect(pickTitles(cut(20), FALLBACK)).toBe(FALLBACK)
  expect(pickTitles({ ...FALLBACK, season: 2025 }, FALLBACK)).toBe(FALLBACK)
})
