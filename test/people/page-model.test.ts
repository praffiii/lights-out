import { expect, it } from 'bun:test'

import { driverPage } from '../../src/people/page-model.ts'
import { PEOPLE, personFor } from '../../src/people/people.ts'
import type { SeasonSnapshot } from '../../src/season/snapshot-schema.ts'
import { NOW as now, snapshot } from './fixture.ts'

const withPeople = (change: (people: NonNullable<SeasonSnapshot['people']>) => NonNullable<SeasonSnapshot['people']>): SeasonSnapshot =>
  snapshot.people ? { ...snapshot, people: change(snapshot.people) } : snapshot

it("builds Ocon's hero, season and career from data", () => {
  const page = driverPage(snapshot, 'ocon', now)

  expect(page?.hero).toMatchObject({ label: 'The people · Haas · No. 31', given: 'Esteban', family: 'Ocon', sub: 'French, 30. In Formula 1 since 2016, with five teams.' })
  expect(page?.season).toEqual({
    label: '2026 · After round 20',
    headline: 'Sixteenth in 2026.',
    body: 'Seven points from 18 races. Haas teammate Oliver Bearman has 23.',
    stats: [
      { label: 'Points', value: '7', note: 'P16 in the championship' },
      { label: 'Best finish', value: '8th', note: 'Azerbaijan, round 15' },
      { label: 'Qualifying vs Bearman', value: '4–13', note: 'Ahead in 4 of 17' },
      { label: 'Races', value: '18', note: 'Of 20 so far' },
    ],
    payoff: 'Best of 2026: 8th in Baku, for 4 points.',
    credit: 'Figures: Jolpica F1 API, after round 20, São Paulo',
  })
  expect(page?.career).toEqual({
    label: 'Career · Since 2016',
    number: '198',
    unit: 'starts in Formula 1',
    headline: 'One win: Hungary, 2021.',
    body: 'With Manor Marussia, Force India, Renault, Alpine and Haas. Best season: 8th, in 2017 and 2022.',
    payoff: 'Ten seasons, five teams.',
    ladder: [
      { label: 'Wins', value: '1' },
      { label: 'Podiums', value: '4' },
      { label: 'Pole positions', value: '0' },
      { label: 'Points', value: '490' },
      { label: 'Best season', value: '8th' },
    ],
    credit: 'Career figures: Jolpica F1 API, after round 20 · points include sprints',
  })
})

it('reads every round, the best one purple and the missed ones as did not race', () => {
  const rows = driverPage(snapshot, 'ocon', now)?.races?.rows ?? []

  expect(rows).toHaveLength(20)
  expect(rows[0]).toEqual({ round: '01', grandPrix: 'Australian', city: 'Melbourne', start: 'P13', finish: 'P11', short: 'P11', points: '0', best: false, dnr: false })
  expect(rows[11]).toMatchObject({ finish: 'Retired', short: 'Out' })
  expect(rows.filter((row) => row.best).map((row) => row.round)).toEqual(['15'])
  expect(rows[15]?.grandPrix).toBe('Bahrain in Malaysia')
  expect(rows[18]).toMatchObject({ grandPrix: 'Mexico City', start: null, finish: 'Did not race', points: null, dnr: true })
})

it('writes a champion with several wins', () => {
  const page = driverPage(snapshot, 'antonelli', now)

  expect(page?.hero).toMatchObject({ given: 'Kimi', family: 'Antonelli', sub: 'Italian, 20. In Formula 1 since 2025, with Mercedes.' })
  expect(page?.season?.headline).toBe('Champion in 2026.')
  expect(page?.season?.payoff).toBe('9 wins in 2026, the first in Shanghai.')
  expect(page?.career).toMatchObject({ number: '44', headline: '9 wins. The first: China, 2026.', body: 'With Mercedes. World champion in 2026.', payoff: 'Two seasons, one team.' })
  expect(page?.career?.ladder.at(-1)).toEqual({ label: 'Titles', value: '1' })
})

it('names the next driver one place down and wraps the last to the leader', () => {
  expect(driverPage(snapshot, 'ocon', now)?.next).toMatchObject({ label: 'Next · P17', name: 'Fernando Alonso', to: '/people/alonso' })
  expect(driverPage(snapshot, 'perez', now)?.next).toMatchObject({ label: 'Next · P1', to: '/people/antonelli' })
})

it('hides the career while the past is missing or stale', () => {
  const stale = withPeople((people) => {
    const ocon = people.past.ocon

    return ocon ? { ...people, past: { ...people.past, ocon: { ...ocon, through: 2024 } } } : people
  })

  expect(driverPage(stale, 'ocon', now)?.career).toBeNull()
  expect(driverPage(snapshot, 'gasly', now)?.career).toBeNull()
  expect(driverPage(snapshot, 'gasly', now)?.season?.headline).toBe('Tenth in 2026.')
})

it('writes a rookie and a winless driver', () => {
  const rookie = withPeople((people) => ({
    ...people,
    past: { ...people.past, arvid_lindblad: { through: 2025, starts: 0, wins: 0, podiums: 0, poles: 0, points: 0, seasons: [], teams: [], firstWin: null, finals: [] } },
  }))

  const page = driverPage(rookie, 'arvid_lindblad', now)

  expect(page?.hero.sub).toBe('British, 19. First season in Formula 1, with Racing Bulls.')
  expect(page?.career?.payoff).toBe('First season.')
  expect(driverPage(snapshot, 'bearman', now)?.career?.headline).toBe('No wins yet.')
})

it('returns null for a driver without a page', () => {
  expect(driverPage(snapshot, 'tsunoda', now)).toBeNull()
})

it('names the driver on the Next portrait', () => {
  expect(driverPage(snapshot, 'ocon', now)?.next.photo?.place).toBe('Fernando Alonso · Shanghai, 2026')
})

it('shows the hero car photo in the Next band when the next driver has no portrait', () => {
  const before = PEOPLE.find((person) => driverPage(snapshot, person.driverId, now)?.next.to === '/people/gasly')

  expect(before).toBeDefined()
  expect(before && driverPage(snapshot, before.driverId, now)?.next.photo).toEqual(personFor('gasly')?.hero)
})

it('shortens every status for the phone and keys the short forms it uses', () => {
  const piastri = driverPage(snapshot, 'piastri', now)?.races

  expect(piastri?.rows.filter((row) => row.finish === 'Did not start').map((row) => row.short)).toEqual(['DNS', 'DNS'])
  expect(piastri?.key).toBe('DNS: did not start. Out: retired.')
  expect(driverPage(snapshot, 'ocon', now)?.races?.key).toBe('Out: retired.')
})
