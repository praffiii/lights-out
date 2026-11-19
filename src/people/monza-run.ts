import { Schema } from 'effect'

import type { CircuitInfo } from '#/circuits/registry.ts'
import { alignLap } from '#/pole/align.ts'
import { sampleRows } from '#/pole/replay.ts'
import { CarResponse, LocationResponse, OpenF1Lap, TelemetryRow } from '#/pole/schema.ts'

const SESSION = 11361

const CODE = 'ANT'

export const RunSource = Schema.Struct({
  lap: OpenF1Lap,
  car: CarResponse,
  location: LocationResponse,
  positions: Schema.Array(Schema.Struct({ date: Schema.String, position: Schema.Number })),
})

export type RunSource = typeof RunSource.Type

export const MonzaRun = Schema.Struct({
  session: Schema.Number,
  code: Schema.String,
  time: Schema.Number,
  rows: Schema.Array(TelemetryRow),
  positions: Schema.Array(Schema.Tuple([Schema.Number, Schema.Number])),
})

export type MonzaRun = typeof MonzaRun.Type

export const MonzaRunJson = Schema.fromJsonString(MonzaRun)

const round = (x: number) => Math.round(x * 1000) / 1000

export const bakeRun = ({ lap, car, location, positions }: RunSource, info: CircuitInfo): MonzaRun | null => {
  const time = lap.lap_duration
  const s1 = lap.duration_sector_1
  const s2 = lap.duration_sector_2

  if (!lap.date_start || time === null || s1 === null || s2 === null) return null

  const start = Date.parse(lap.date_start)
  const aligned = alignLap({ start, time, splits: [s1, s1 + s2], car, location, line: info.line, cuts: info.cuts, standing: true })

  if (!aligned) return null

  const timed = positions.map((p) => [round((Date.parse(p.date) - start) / 1000), p.position] as const).filter(([t]) => t <= time)
  const before = timed.filter(([t]) => t <= 0).at(-1)
  const during = timed.filter(([t]) => t > 0)

  return { session: SESSION, code: CODE, time, rows: aligned.rows, positions: before ? [[0, before[1]], ...during] : during }
}

export const runAt = (run: MonzaRun, t: number) => {
  const at = Math.min(run.time, Math.max(0, t))
  const position = run.positions.filter(([from]) => from <= at).at(-1)?.[1] ?? run.positions[0]?.[1] ?? 0

  return { u: sampleRows(run.rows, at).u, position, done: t >= run.time }
}

export const chipText = (run: MonzaRun, t: number) => {
  const { position, done } = runAt(run, t)

  return `${run.code} · P${position}${done ? ' · after lap 1' : ''}`
}
