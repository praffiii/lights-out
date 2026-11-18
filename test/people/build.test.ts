import { expect, it } from 'bun:test'
import { Effect, Layer } from 'effect'

import { buildPeople } from '../../src/people/build.ts'
import type { People } from '../../src/people/schema.ts'
import { JolpicaClient } from '../../src/season/jolpica-client.ts'
import { drivers2026r20, missing, peopleFake, qualifying2026r20, results2026r20, sprints2026r20 } from '../season/fake-jolpica.ts'

const build = (previous?: People, overrides: Partial<JolpicaClient['Service']> = {}) =>
  Effect.runPromise(buildPeople(2026, results2026r20.races, sprints2026r20.races, previous).pipe(Effect.provide(Layer.succeed(JolpicaClient, { ...peopleFake, ...overrides }))))

const counting = (calls: Array<string>): Partial<JolpicaClient['Service']> => ({
  driverResults: (id, offset) => Effect.sync(() => calls.push(`results ${id}`)).pipe(Effect.andThen(peopleFake.driverResults(id, offset))),
  driverSprints: (id, offset) => Effect.sync(() => calls.push(`sprint ${id}`)).pipe(Effect.andThen(peopleFake.driverSprints(id, offset))),
  driverPoles: (id, offset) => Effect.sync(() => calls.push(`poles ${id}`)).pipe(Effect.andThen(peopleFake.driverPoles(id, offset))),
})

it('keeps every 2026 race row per driver', async () => {
  const people = await build()

  expect(people?.season).toBe(2026)
  expect(people?.rounds).toHaveLength(20)
  expect(people?.rounds[14]).toEqual({ round: 15, raceName: 'Azerbaijan Grand Prix', locality: 'Baku', country: 'Azerbaijan' })
  expect(people?.results.ocon).toHaveLength(18)
  expect(people?.results.ocon?.[14]).toEqual({ round: 15, grid: 13, position: 8, positionText: '8', points: 4, constructorId: 'haas' })
  expect(people?.sprintPoints.antonelli).toBe(31)
  expect(people?.born.ocon).toBe('1996-09-17')
  expect(people?.qualifying).toHaveLength(qualifying2026r20.races.length)
})

it('builds a past career through the season before', async () => {
  const people = await build()
  const ocon = people?.past.ocon

  expect(ocon).toMatchObject({
    through: 2025,
    starts: 180,
    wins: 1,
    podiums: 4,
    poles: 0,
    points: 483,
    seasons: [2016, 2017, 2018, 2020, 2021, 2022, 2023, 2024, 2025],
    firstWin: { season: 2021, country: 'Hungary' },
  })
  expect(ocon?.teams.map((team) => team.constructorId)).toEqual(['manor', 'force_india', 'renault', 'alpine', 'haas'])
  expect(ocon?.finals).toEqual([2016, 2017, 2018, 2020, 2021, 2022, 2023, 2024, 2025].map((season, i) => ({ season, position: [23, 8, 12, 12, 11, 8, 12, 14, 15][i] })))
  expect(people?.past.antonelli).toMatchObject({ starts: 24, wins: 0, podiums: 3, poles: 0, points: 150, finals: [{ season: 2025, position: 7 }] })
  expect(people?.past.bearman).toMatchObject({
    starts: 27,
    points: 48,
    finals: [
      { season: 2024, position: 18 },
      { season: 2025, position: 13 },
    ],
  })
})

it('skips drivers whose career fetch fails and keeps their previous entry', async () => {
  const fresh = await build()
  const ocon = fresh?.past.ocon
  const previous = fresh && ocon && { ...fresh, past: { bearman: { ...ocon, through: 2024, starts: 1 } } }
  const people = await build(previous || undefined, { driverResults: (id, offset) => (id === 'bearman' ? missing('/drivers/bearman/results') : peopleFake.driverResults(id, offset)) })

  expect(people?.past.bearman?.through).toBe(2024)
  expect(people?.past.bearman?.starts).toBe(1)
  expect(people?.past.ocon?.through).toBe(2025)
})

it('copies fresh pasts without a request', async () => {
  const first = await build()
  const calls: Array<string> = []
  const second = await build(first, counting(calls))

  expect(calls.filter((call) => call.endsWith(' ocon'))).toEqual([])
  expect(second?.past.ocon).toEqual(first?.past.ocon)
})

it('stops starting new drivers after 60 requests', async () => {
  const row = results2026r20.races[0]?.rows[0]
  let requests = 0

  const tiny: Partial<JolpicaClient['Service']> = {
    driverResults: () => Effect.sync(() => requests++).pipe(Effect.as({ total: 1, races: row ? [{ season: 2020, round: 1, country: 'Austria', row }] : [] })),
    driverSprints: () => Effect.sync(() => requests++).pipe(Effect.as({ total: 0, races: [] })),
    driverPoles: () => Effect.sync(() => requests++).pipe(Effect.as({ total: 0, seasons: [] })),
    driverStandings: () => Effect.sync(() => requests++).pipe(Effect.as(drivers2026r20)),
  }

  const people = await build(undefined, tiny)
  const drivers = new Set(results2026r20.races.flatMap((race) => race.rows.map((r) => r.driver.driverId)))

  expect(requests).toBeLessThanOrEqual(63)
  expect(requests).toBeGreaterThanOrEqual(60)
  expect(Object.keys(people?.past ?? {}).length).toBeLessThan(drivers.size)
})

it('keeps the previous people when season qualifying fails', async () => {
  const previous = await build()
  const people = await build(previous, { seasonQualifying: () => missing('/2026/qualifying') })

  expect(people).toEqual(previous)
})
