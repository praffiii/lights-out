import { Effect, Layer, Schema } from 'effect'

import { OpenF1Client } from '../../src/season/openf1-client.ts'
import { DriversResponse, ResultResponse, SessionsResponse } from '../../src/season/openf1-schema.ts'

const fixture = (name: string) => Bun.file(`test/fixtures/openf1/${name}.json`).json()

export const sessions2026 = Schema.decodeUnknownSync(SessionsResponse)(await fixture('sessions-2026'))

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
  sessions: (year) => Effect.succeed(year === 2026 ? sessions2026 : []),
  result: (key) => Effect.succeed(resultOf(key)),
  drivers: (key) => Effect.succeed(driversOf(key)),
}

export const fakeOpenF1 = (overrides: Partial<OpenF1Client['Service']> = {}) => Layer.succeed(OpenF1Client, { ...fakeOpenF1Service, ...overrides })
