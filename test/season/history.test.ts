import { expect, it } from 'bun:test'

import { seasonHistory } from '../../src/season/history.ts'
import type { ResultRow } from '../../src/season/jolpica-schema.ts'
import { constructors, drivers, pageOf, raceResults2026, sprintResults2026 } from './fake-jolpica.ts'

const history = seasonHistory(raceResults2026.races, sprintResults2026.races)

const pointsOf = (match: (team: (typeof history.teams)[number]) => boolean) => history.teams.filter(match).reduce((sum, team) => sum + team.points, 0)

it("every driver's summed points equal the official standings", () => {
  const rows = drivers?.rows ?? []

  expect(rows).toHaveLength(25)

  for (const row of rows) {
    expect([row.driver.familyName, pointsOf((team) => team.driver.driverId === row.driver.driverId)]).toEqual([row.driver.familyName, row.points])
  }
})

it("every team's summed points equal the official constructor total", () => {
  const rows = constructors?.rows ?? []

  expect(rows).toHaveLength(11)

  for (const row of rows) {
    const id = row.constructor.constructorId

    expect([id, pointsOf((team) => team.constructorId === id)]).toEqual([id, row.points])
  }

  const redBull = history.teams
    .filter((team) => team.constructorId === 'red_bull' && team.points > 0)
    .map((team) => [team.driver.code, team.points])
    .sort()

  expect(redBull).toEqual([
    ['HAD', 107],
    ['LAW', 14],
    ['VER', 261],
  ])
})

it('leaders run over rounds 1 to 19: Russell, then Antonelli', () => {
  expect(history.round).toBe(19)
  expect(history.leaders.map((leader) => leader.round)).toEqual(Array.from({ length: 19 }, (_, i) => i + 1))
  expect(history.leaders.slice(0, 3).map((leader) => [leader.driver.code, leader.lead])).toEqual([
    ['RUS', 7],
    ['RUS', 4],
    ['ANT', 9],
  ])
  expect(history.leaders.slice(2).every((leader) => leader.driver.code === 'ANT')).toBe(true)
  expect(history.leaders.at(-1)?.lead).toBe(119)
})

it('a round split across pages is merged', () => {
  const offsets = [0, 100, 200, 300, 400]

  const paged = seasonHistory(
    offsets.flatMap((offset) => pageOf(raceResults2026, offset).races),
    [0, 100].flatMap((offset) => pageOf(sprintResults2026, offset).races),
  )

  expect(pageOf(raceResults2026, 0).races.at(-1)?.rows.length).toBeLessThan(22)
  expect(paged).toEqual(history)
})

it('history stops before a round with no race results', () => {
  const gap = seasonHistory(
    raceResults2026.races.filter((race) => race.round !== 12),
    sprintResults2026.races,
  )

  expect(gap.round).toBe(11)
  expect(gap.leaders.at(-1)?.round).toBe(11)
})

it('a tie on points goes to more wins', () => {
  const template = raceResults2026.races[0]?.rows[0]

  if (!template) throw new Error('fixture has no rows')

  const row = (driverId: string, position: number, points: number): ResultRow => ({
    ...template,
    position,
    positionText: String(position),
    points,
    driver: { ...template.driver, driverId, code: driverId.toUpperCase() },
  })

  const tied = seasonHistory(
    [
      { round: 1, rows: [row('bbb', 3, 15), row('aaa', 1, 25)] },
      { round: 2, rows: [row('bbb', 2, 18), row('aaa', 6, 8)] },
    ],
    [],
  )

  expect(tied.leaders.at(-1)).toMatchObject({ round: 2, lead: 0, driver: { driverId: 'aaa' } })
})
