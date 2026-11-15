import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { SpeedLapsResponse, type SpeedRace } from '../../src/speed/schema.ts'
import { fastestLap, raceRow, seasonBest, speedLine } from '../../src/speed/top.ts'
import { driversOf, sessions2026 } from '../season/fake-openf1.ts'

const mexico = Schema.decodeUnknownSync(SpeedLapsResponse)(await Bun.file('test/fixtures/openf1/laps-11404.json').json())

const mexicoSession = sessions2026.find((s) => s.session_key === 11404)

if (!mexicoSession) throw new Error('Mexico City is in the 2026 sessions fixture')

const row = (kmh: number, sessionKey: number): SpeedRace => ({ sessionKey, circuit: `c${sessionKey}`, dateEnd: '2026-01-01T00:00:00Z', kmh, driverNumber: 1, surname: 'Norris', lap: 1 })

const mexicoRow: SpeedRace = { sessionKey: 11404, circuit: 'Mexico City', dateEnd: mexicoSession.date_end, kmh: 361, driverNumber: 10, surname: 'Gasly', lap: 48 }

it('takes the highest speed trap reading in the race, earlier lap on a tie', () => {
  expect(fastestLap(mexico)).toMatchObject({ driver_number: 10, lap_number: 48, st_speed: 361 })
})

it('skips laps without a speed trap reading', () => {
  expect(fastestLap([{ driver_number: 1, lap_number: 1, st_speed: null }])).toBeUndefined()
})

it('writes the Mexico City row with the driver surname', () => {
  expect(raceRow(mexicoSession, mexico, driversOf(11404))).toEqual(mexicoRow)
})

it('writes no row when the fastest driver is missing from the entry list', () => {
  expect(raceRow(mexicoSession, mexico, [])).toBeUndefined()
})

it('the season best is the highest row, earlier race on a tie', () => {
  expect(seasonBest([row(340, 1), row(361, 2), row(361, 3)])?.sessionKey).toBe(2)
})

it('reads the line from the mock', () => {
  expect(speedLine(mexicoRow)).toBe('Car 10, Gasly, through the Mexico City speed trap on lap 48. Flaps open.')
})
