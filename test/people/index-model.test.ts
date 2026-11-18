import { expect, it } from 'bun:test'

import { peopleIndex } from '../../src/people/page-model.ts'
import type { SeasonSnapshot } from '../../src/season/snapshot-schema.ts'
import { NOW as now, snapshot } from './fixture.ts'

const standings = snapshot.driverStandings

const withStandings = (change: (rows: NonNullable<SeasonSnapshot['driverStandings']>) => NonNullable<SeasonSnapshot['driverStandings']>): SeasonSnapshot =>
  standings ? { ...snapshot, driverStandings: change(standings) } : snapshot

it('counts the grid and names the champion, the youngest and the oldest', () => {
  const index = peopleIndex(snapshot, now)

  expect(index?.hero).toMatchObject({
    label: 'The people · 2026 season',
    count: 22,
    body: 'Eleven teams, two cars each. Who drives for whom, how they stand after São Paulo, and the champions they are chasing.',
  })
  expect(index?.hero.facts).toEqual([
    { label: 'Champion', value: 'Antonelli', note: 'Aged 20' },
    { label: 'Youngest', value: 'Lindblad', note: 'Aged 19' },
    { label: 'Oldest', value: 'Alonso', note: 'Aged 45' },
  ])
})

it('links the 22 race drivers and names the stand-ins below the tower', () => {
  const tower = peopleIndex(snapshot, now)?.tower

  expect(tower?.label).toBe('The grid · after round 20')
  expect(tower?.meta).toBe('22 drivers · 11 teams · points after São Paulo')
  expect(tower?.rows).toHaveLength(25)
  expect(tower?.rows.filter((row) => row.to !== null)).toHaveLength(22)
  expect(tower?.rows[0]).toMatchObject({ position: '01', number: '12', name: 'Kimi Antonelli', team: 'Mercedes', nationality: 'Italian', points: '390', to: '/people/antonelli', champion: true })
  expect(tower?.rows.filter((row) => row.champion)).toHaveLength(1)
  expect(tower?.rows.find((row) => row.name.includes('Tsunoda'))?.to).toBeNull()
  expect(tower?.footnote).toBe('Also raced in 2026: Yuki Tsunoda (Racing Bulls, rounds 12 to 14), Ryo Hirakawa (Haas, round 19) and Rafael Camara (Haas, round 20).')
})

it('shows the leader, not a champion, while the title is open', () => {
  const open = withStandings((table) => ({ ...table, rows: table.rows.map((row, i) => (i === 1 ? { ...row, points: 380 } : row)) }))
  const index = peopleIndex(open, now)

  expect(index?.hero.facts[0]).toEqual({ label: 'Leader', value: 'Antonelli', note: 'Aged 20' })
  expect(index?.tower.rows.filter((row) => row.champion)).toHaveLength(0)
})

it('hides the 2026 champion band once the standings move to 2027', () => {
  expect(peopleIndex(snapshot, now)?.band.visible).toBe(true)
  expect(
    peopleIndex(
      withStandings((table) => ({ ...table, season: 2027 })),
      now,
    )?.band.visible,
  ).toBe(false)
})
