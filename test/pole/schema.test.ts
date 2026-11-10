import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { CarResponse, LapsResponse, LocationResponse, PoleLapJson, WeatherResponse } from '../../src/pole/schema.ts'
import { ResultResponse } from '../../src/season/openf1-schema.ts'

const KEYS = [9854, 11408, 11230, 9846, 9835]

const raw = (key: number, part: string) => Bun.file(`test/fixtures/openf1/pole/${key}-${part}.json`).json()

it.each(KEYS)('decodes every recorded pole response for session %d', async (key) => {
  const [pole] = Schema.decodeUnknownSync(ResultResponse)(await raw(key, 'result'))
  const laps = Schema.decodeUnknownSync(LapsResponse)(await raw(key, 'laps'))

  expect(Schema.decodeUnknownSync(CarResponse)(await raw(key, 'car')).length).toBeGreaterThan(200)
  expect(Schema.decodeUnknownSync(LocationResponse)(await raw(key, 'location')).length).toBeGreaterThan(200)
  expect(Schema.decodeUnknownSync(WeatherResponse)(await raw(key, 'weather')).length).toBeGreaterThan(0)

  const time = pole?.duration ?? null

  expect(time).not.toBeNull()
  expect(laps.some((lap) => lap.lap_duration !== null && time !== null && Math.abs(lap.lap_duration - time) < 0.01)).toBe(true)
})

it('round-trips a PoleLap through PoleLapJson', () => {
  const lap = { sessionKey: 9854, year: 2025, driver: 'Lando Norris', wet: true, time: 107.934, sectors: [30.43, 36.842, 40.662] as const, rows: [[0, 0.97, 300, 8, 100, 0] as const] }
  const json = Schema.encodeSync(PoleLapJson)(lap)

  expect(Schema.decodeUnknownSync(PoleLapJson)(json)).toEqual(lap)
})
