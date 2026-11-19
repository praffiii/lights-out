import { expect, it } from 'bun:test'

import { creditParts } from '../../src/credits/photos.ts'
import { career, storyPage } from '../../src/people/page-model.ts'
import { HERO, MONZA, RECORD, STORY_PHOTOS } from '../../src/people/story.ts'
import { NOW, snapshot } from './fixture.ts'

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

it('reads the story numbers from the snapshot', () => {
  const page = storyPage(snapshot, NOW)

  expect(page?.label).toBe('The people · Mercedes · No. 12')
  expect(page?.numbers.label).toBe('In Formula 1 · 44 starts')
  expect(page?.numbers.body).toBe('He arrived in 2025 at 18, the third-youngest driver in F1 history. A year later he won nine Grands Prix.')
  expect(page?.numbers.stats.map(({ label, value, note }) => [label, value, note])).toEqual([
    ['Wins', '9', 'Nine of them in 2026'],
    ['Pole positions', '7', 'The first at 19, the youngest ever'],
    ['Podiums', '19', 'From 44 starts'],
    ['Car number', '12', 'Kept for his title defence'],
  ])
  expect(page?.numbers.credit).toBe('Figures: Jolpica F1 API, after round 20, São Paulo')
  expect(page?.races.rows).toHaveLength(20)
  expect(page?.races.rows.filter((row) => row.best).map((row) => row.grandPrix)).toEqual(['Chinese'])
})

it('agrees with the career on the template', () => {
  const totals = snapshot.people && career(snapshot.people, 'antonelli')

  expect(
    storyPage(snapshot, NOW)
      ?.numbers.stats.slice(0, 3)
      .map((stat) => stat.value),
  ).toEqual([String(totals?.wins), String(totals?.poles), String(totals?.podiums)])
  expect(storyPage(snapshot, NOW)?.numbers.label).toBe(`In Formula 1 · ${totals?.starts} starts`)
})

it('drops the 2026 win count once the standings move to 2027', () => {
  const standings = snapshot.driverStandings

  if (!standings) throw new Error('the fixture has no standings')

  const page = storyPage({ ...snapshot, driverStandings: { ...standings, season: 2027 } }, NOW)

  expect(page?.numbers.body).toBe('He arrived in 2025 at 18, the third-youngest driver in F1 history.')
  expect(page?.numbers.stats[0]?.note).toBe('')
  expect(page?.numbers.stats.map((stat) => stat.value)).toEqual(['9', '7', '19', '12'])
})

it('is null without people data or without an Antonelli standings row', () => {
  const standings = snapshot.driverStandings

  if (!standings) throw new Error('the fixture has no standings')

  const rows = standings.rows.filter((row) => row.driver.driverId !== 'antonelli')
  const { people, ...bare } = snapshot

  expect([people === undefined, storyPage(bare, NOW)]).toEqual([false, null])
  expect(storyPage({ ...snapshot, driverStandings: { ...standings, rows } }, NOW)).toBeNull()
})

it('credits his lap 1 to OpenF1 in the Monza footnote', () => {
  expect(MONZA.footnote.endsWith('sectors, grid and his lap 1: OpenF1, 2026 race')).toBe(true)
})
