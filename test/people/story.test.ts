import { expect, it } from 'bun:test'

import { creditParts } from '../../src/credits/photos.ts'
import { HERO, RECORD, STORY_PHOTOS } from '../../src/people/story.ts'

const DAY = 86_400_000

const age = (born: string, on: string) => {
  const [by = 0, bm = 1, bd = 1] = born.split('-').map(Number)
  const [oy = 0, om = 1, od = 1] = on.split('-').map(Number)
  const years = oy - by - (om < bm || (om === bm && od < bd) ? 1 : 0)
  const birthday = Date.UTC(by + years, bm - 1, bd)

  return { years, days: Math.round((Date.UTC(oy, om - 1, od) - birthday) / DAY) }
}

it('credits every story photo from Commons, and the files exist', async () => {
  for (const photo of STORY_PHOTOS) {
    expect(photo.source).toStartWith('https://commons.wikimedia.org/wiki/File:')
    expect(creditParts(photo.credit)).not.toBeNull()
    expect(await Bun.file(`public${photo.src}`).exists()).toBe(true)
  }

  expect(await Bun.file(`public${HERO.photo.src.replace(/\.jpg$/, '-phone.jpg')}`).exists()).toBe(true)
})

it('the record copy agrees with itself', () => {
  const antonelli = age('2006-08-25', '2026-11-01')
  const vettel = age('1987-07-03', '2010-11-14')

  expect(antonelli).toEqual({ years: 20, days: 68 })
  expect<ReadonlyArray<string>>([RECORD.number, RECORD.unit]).toEqual([String(antonelli.years), `years and ${antonelli.days} days old`])
  expect<ReadonlyArray<ReadonlyArray<string | number>>>(RECORD.ages.map(({ name, season, years, days }) => [name, season, years, days])).toEqual([
    ['Antonelli', 2026, antonelli.years, antonelli.days],
    ['Vettel', 2010, vettel.years, vettel.days],
    ['Hamilton', 2008, ...Object.values(age('1985-01-07', '2008-11-02'))],
    ['Alonso', 2005, ...Object.values(age('1981-07-29', '2005-09-25'))],
    ['Verstappen', 2021, ...Object.values(age('1997-09-30', '2021-12-12'))],
  ])
  expect<string>(RECORD.payoff).toBe(`${vettel.years - antonelli.years} years and ${vettel.days - antonelli.days} days younger.`)
  expect(RECORD.ages.map((a) => a.years * 366 + a.days)).toEqual(RECORD.ages.map((a) => a.years * 366 + a.days).sort((a, b) => a - b))
})
