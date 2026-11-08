import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import {
  ConstructorStandingsResponse,
  DriverStandingsResponse,
  QualifyingResponse,
  RaceResultsResponse,
  RacesResponse,
  SprintResponse,
} from '../../src/season/jolpica-schema.ts'

const fixture = (name: string) => Bun.file(`test/fixtures/jolpica/${name}.json`).json()

it('decodes the 2026 calendar with numeric rounds', async () => {
  const calendar = Schema.decodeUnknownSync(RacesResponse)(await fixture('races-2026'))

  expect(calendar.season).toBe(2026)
  expect(calendar.races.length).toBeGreaterThan(20)
  expect(calendar.races[0]?.round).toBe(1)
  expect(calendar.races[0]?.circuit.circuitId).toBe('albert_park')
})

it('builds sprint-weekend sessions without FP2/FP3', async () => {
  const calendar = Schema.decodeUnknownSync(RacesResponse)(await fixture('races-2026'))
  const china = calendar.races.find((race) => race.round === 2)

  expect(china?.sessions.map((session) => session.name)).toEqual(['FP1', 'SprintQualifying', 'Sprint', 'Qualifying', 'Race'])
})

it('marks sessions without a time as unconfirmed', () => {
  const race = {
    season: '2027',
    round: '1',
    raceName: 'Test Grand Prix',
    Circuit: { circuitId: 'test', circuitName: 'Test Circuit', Location: { locality: 'Town', country: 'Land' } },
    date: '2027-03-07',
    time: '05:00:00Z',
    Qualifying: { date: '2027-03-06' },
  }

  const calendar = Schema.decodeUnknownSync(RacesResponse)({ MRData: { RaceTable: { season: '2027', Races: [race] } } })
  const qualifying = calendar.races[0]?.sessions.find((session) => session.name === 'Qualifying')

  expect(qualifying).toEqual({ name: 'Qualifying', startsAt: '2027-03-06T00:00:00Z', timeConfirmed: false })
  expect(calendar.races[0]?.sessions.at(-1)).toEqual({ name: 'Race', startsAt: '2027-03-07T05:00:00Z', timeConfirmed: true })
})

it('decodes results points and grid as numbers', async () => {
  const results = Schema.decodeUnknownSync(RaceResultsResponse)(await fixture('results-last'))

  expect(results.race).toEqual({ season: 2026, round: 19, raceName: 'Mexico City Grand Prix' })
  expect(results.rows[0]?.points).toBe(25)
  expect(results.rows[0]?.grid).toBe(5)
  expect(results.rows[0]?.driver.code).toBe('VER')
  expect(results.rows.at(-1)?.time).toBeNull()
})

it('decodes qualifying times, missing Q2 and Q3 as null', async () => {
  const qualifying = Schema.decodeUnknownSync(QualifyingResponse)(await fixture('qualifying-last'))

  expect(qualifying.rows[0]?.q3).toBe('1:16.514')
  expect(qualifying.rows.at(-1)?.q2).toBeNull()
})

it('decodes empty races to race: null', async () => {
  expect(Schema.decodeUnknownSync(SprintResponse)(await fixture('sprint-empty'))).toEqual({ race: null, rows: [] })
})

it('decodes standings with numbers', async () => {
  const drivers = Schema.decodeUnknownSync(DriverStandingsResponse)(await fixture('driverstandings-2026'))
  const teams = Schema.decodeUnknownSync(ConstructorStandingsResponse)(await fixture('constructorstandings-2026'))

  expect(drivers?.season).toBe(2026)
  expect(drivers?.rows[0]).toMatchObject({ position: 1, points: 380, driver: { familyName: 'Antonelli' } })
  expect(teams?.rows[0]).toMatchObject({ position: 1, points: 630, constructor: { name: 'Mercedes' } })
})

it('decodes empty StandingsLists to null', async () => {
  expect(Schema.decodeUnknownSync(DriverStandingsResponse)(await fixture('standings-empty'))).toBeNull()
})

it('rejects a non-numeric points string', async () => {
  const json = await fixture('results-last')
  json.MRData.RaceTable.Races[0].Results[0].points = 'abc'

  expect(() => Schema.decodeUnknownSync(RaceResultsResponse)(json)).toThrow(Schema.SchemaError)
})

it('keeps a driver with no nationality yet', async () => {
  const drivers = Schema.decodeUnknownSync(DriverStandingsResponse)(await fixture('driverstandings-2026'))

  expect(drivers?.rows.find((row) => row.driver.driverId === 'rafael_camara')?.driver.nationality).toBeNull()
})
