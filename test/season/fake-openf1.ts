import { Effect, Layer, Schema } from 'effect'

import { OpenF1Client } from '../../src/season/openf1-client.ts'
import { CarResponse, LapsResponse, LocationResponse, WeatherResponse } from '../../src/pole/schema.ts'
import { DriversResponse, ResultResponse, SessionsResponse } from '../../src/season/openf1-schema.ts'

const fixture = (name: string) => Bun.file(`test/fixtures/openf1/${name}.json`).json()

export const sessions2026 = Schema.decodeUnknownSync(SessionsResponse)(await fixture('sessions-2026'))

export const sessions2025 = Schema.decodeUnknownSync(SessionsResponse)(await fixture('sessions-2025'))

const byYear = new Map([
  [2026, sessions2026],
  [2025, sessions2025],
])

export const POLE_KEYS = [9854, 11408, 11230, 9846, 9835]

const pole = await Promise.all(
  POLE_KEYS.map(async (key) => ({
    key,
    result: Schema.decodeUnknownSync(ResultResponse)(await fixture(`pole/${key}-result`)),
    laps: Schema.decodeUnknownSync(LapsResponse)(await fixture(`pole/${key}-laps`)),
    car: Schema.decodeUnknownSync(CarResponse)(await fixture(`pole/${key}-car`)),
    location: Schema.decodeUnknownSync(LocationResponse)(await fixture(`pole/${key}-location`)),
    weather: Schema.decodeUnknownSync(WeatherResponse)(await fixture(`pole/${key}-weather`)),
  })),
)

export const poleOf = (key: number) => pole.find((p) => p.key === key)

const within = <A extends { readonly date: string }>(rows: ReadonlyArray<A> | undefined, from: string, to: string) => (rows ?? []).filter((row) => Date.parse(row.date) > Date.parse(from) && Date.parse(row.date) < Date.parse(to))

const SAVED = [11404, 11406, 11408, 11412]

const saved = await Promise.all(
  SAVED.map(async (key) => ({
    key,
    result: Schema.decodeUnknownSync(ResultResponse)(await fixture(`result-${key}`)),
    drivers: Schema.decodeUnknownSync(DriversResponse)(await fixture(`drivers-${key}`)),
  })),
)

export const resultOf = (key: number) => saved.find((s) => s.key === key)?.result ?? []

export const driversOf = (key: number) => saved.find((s) => s.key === key)?.drivers ?? []

export const fakeOpenF1Service: OpenF1Client['Service'] = {
  sessions: (year) => Effect.succeed(byYear.get(year) ?? []),
  result: (key) => Effect.succeed(resultOf(key).length > 0 ? resultOf(key) : (poleOf(key)?.result ?? [])),
  laps: (key) => Effect.succeed(poleOf(key)?.laps ?? []),
  carData: (key, _driver, from, to) => Effect.succeed(within(poleOf(key)?.car, from, to)),
  location: (key, _driver, from, to) => Effect.succeed(within(poleOf(key)?.location, from, to)),
  weather: (key) => Effect.succeed(poleOf(key)?.weather ?? []),
  drivers: (key) => Effect.succeed(driversOf(key)),
}

export const fakeOpenF1 = (overrides: Partial<OpenF1Client['Service']> = {}) => Layer.succeed(OpenF1Client, { ...fakeOpenF1Service, ...overrides })
