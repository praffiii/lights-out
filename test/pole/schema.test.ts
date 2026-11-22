import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { CarResponse, isComplete, LapsResponse, LocationResponse, PoleLapJson, StintsResponse } from '../../src/pole/schema.ts'
import { ResultResponse } from '../../src/season/openf1-schema.ts'

const KEYS = [9854, 11408, 11230, 9846, 9835]

const raw = (key: number, part: string) => Bun.file(`test/fixtures/openf1/pole/${key}-${part}.json`).json()

it.each(KEYS)('decodes every recorded pole response for session %d', async (key) => {
  const [pole] = Schema.decodeUnknownSync(ResultResponse)(await raw(key, 'result'))
  const laps = Schema.decodeUnknownSync(LapsResponse)(await raw(key, 'laps'))

  expect(Schema.decodeUnknownSync(CarResponse)(await raw(key, 'car')).length).toBeGreaterThan(200)
  expect(Schema.decodeUnknownSync(LocationResponse)(await raw(key, 'location')).length).toBeGreaterThan(200)
  expect(Schema.decodeUnknownSync(StintsResponse)(await raw(key, 'stints')).length).toBeGreaterThan(0)

  const time = pole?.duration ?? null

  expect(time).not.toBeNull()
  expect(laps.some((lap) => lap.lap_duration !== null && time !== null && Math.abs(lap.lap_duration - time) < 0.01)).toBe(true)
})

it('round-trips a PoleLap through PoleLapJson', () => {
  const lap = { sessionKey: 9854, year: 2025, driver: 'Lando Norris', wet: true, time: 107.934, sectors: [30.43, 36.842, 40.662] as const, rows: [[0, 0.97, 300, 8, 100, 0] as const] }
  const json = Schema.encodeSync(PoleLapJson)(lap)

  expect(Schema.decodeUnknownSync(PoleLapJson)(json)).toEqual(lap)
})

it('a stint row without a tyre age still decodes, so the hourly pole refresh keeps working', () => {
  const [stint] = Schema.decodeUnknownSync(StintsResponse)([{ lap_start: 1, lap_end: 20, compound: 'MEDIUM' }])

  expect(stint?.tyre_age_at_start ?? null).toBeNull()
})

it('decodes a saved six-column lap without team or date as incomplete', async () => {
  const vegas = Schema.decodeUnknownSync(PoleLapJson)(await Bun.file('test/fixtures/pole/vegas.json').text())

  expect(vegas.rows[0]?.length).toBe(6)
  expect(vegas.team).toBeUndefined()
  expect(vegas.date).toBeUndefined()
  expect(isComplete(vegas)).toBe(false)
})

it('decodes a seven-column lap with team and date as complete', () => {
  const lap = {
    sessionKey: 11357,
    year: 2026,
    driver: 'Pierre Gasly',
    team: 'Alpine',
    date: '2026-09-05T14:00:00+00:00',
    wet: false,
    time: 81.786,
    sectors: [26.817, 27.601, 27.368] as const,
    rows: [[0, 0.99, 300, 8, 100, 0, 11400] as const],
  }

  const decoded = Schema.decodeUnknownSync(PoleLapJson)(Schema.encodeSync(PoleLapJson)(lap))

  expect(decoded).toEqual(lap)
  expect(isComplete(decoded)).toBe(true)
})
