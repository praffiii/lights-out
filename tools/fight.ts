import { writeFileSync } from 'node:fs'

import { Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/http'

import { allCircuits } from '../src/circuits/registry.ts'
import type { FightFile } from '../src/fight/schema.ts'
import { crossTime } from '../src/pass/model.ts'
import { alignLap } from '../src/pole/align.ts'
import { sampleRows } from '../src/pole/replay.ts'
import type { PoleRow } from '../src/pole/schema.ts'
import { OpenF1Client } from '../src/season/openf1-client.ts'

const SESSION = 11234
const DRIVERS = [16, 63] as const
const LAPS = [7, 8, 9] as const
const END = 96
const EDGE_MS = 1000
const STEP = 0.01

const arg = (name: string) => {
  const i = process.argv.indexOf(name)

  return i >= 0 ? process.argv[i + 1] : undefined
}

const info = allCircuits().find((c) => c.model === 'au-1953')

if (!info) throw new Error('au-1953 is not in the circuit registry')

const lengthM = Number(info.facts.lengthKm) * 1000
const iso = (ms: number) => new Date(ms).toISOString()
const clamp = (x: number) => Math.min(100, Math.max(0, x))

const run = (driver: number) =>
  OpenF1Client.use((client) =>
    Effect.gen(function* () {
      const laps = yield* client.laps(SESSION, driver)
      const rows: PoleRow[] = []

      for (const n of LAPS) {
        const lap = laps.find((l) => l.lap_number === n)
        const s1 = lap?.duration_sector_1
        const s2 = lap?.duration_sector_2
        const time = lap?.lap_duration

        if (!lap?.date_start || !s1 || !s2 || !time) throw new Error(`driver ${driver} lap ${n} has no times`)

        const start = Date.parse(lap.date_start)
        const car = yield* client.carData(SESSION, driver, iso(start - EDGE_MS), iso(start + time * 1000 + EDGE_MS))
        const location = yield* client.location(SESSION, driver, iso(start - EDGE_MS), iso(start + time * 1000 + EDGE_MS))
        const fit = alignLap({ start, time, splits: [s1, s1 + s2], car, location, line: info.line, cuts: info.cuts })

        if (!fit) throw new Error(`driver ${driver} lap ${n} does not align`)

        const lift = Math.round(fit.rows[0]?.[1] ?? 0)

        for (const r of fit.rows) {
          const u = r[1] - lift + n - 8

          if (u > (rows.at(-1)?.[1] ?? -Infinity)) rows.push([start / 1000 + r[0], u, r[2], r[3], clamp(r[4]), r[5]])
        }
      }

      return rows
    }),
  )

const study = Effect.gen(function* () {
  const client = yield* OpenF1Client
  const drivers = yield* client.drivers(SESSION)
  const runs: Array<{ d: number; rows: ReadonlyArray<PoleRow> }> = []

  for (const d of DRIVERS) runs.push({ d, rows: yield* run(d) })

  const zero = crossTime(runs[0]?.rows ?? [], 0)

  if (zero === null) throw new Error('the leader never crosses the line')

  const cut = (rows: ReadonlyArray<PoleRow>) => {
    const on = rows.map((r): PoleRow => [Math.round((r[0] - zero) * 1000) / 1000, Math.round(r[1] * 1e5) / 1e5, r[2], r[3], r[4], r[5]])
    const first = on.findIndex((r) => r[0] > 0) - 1
    const last = on.findIndex((r) => r[0] > END)

    return on.slice(Math.max(0, first), last + 1)
  }

  const car = (d: number) => {
    const x = drivers.find((y) => y.driver_number === d)

    if (!x) throw new Error(`no driver ${d}`)

    return { code: x.name_acronym, name: `${x.first_name} ${x.last_name}`, team: x.team_name, rows: cut(runs.find((r) => r.d === d)?.rows ?? []) }
  }

  const file: FightFile = { session: SESSION, race: 'Australia', year: 2026, laps: [8, 9], lengthM, cars: [car(DRIVERS[0]), car(DRIVERS[1])] }

  return file
})

const file = await Effect.runPromise(study.pipe(Effect.provide(OpenF1Client.layer.pipe(Layer.provide(FetchHttpClient.layer)))))
const [a, b] = file.cars
let lead = sampleRows(a.rows, 0).u > sampleRows(b.rows, 0).u

for (let t = STEP; t <= END; t += STEP) {
  const now = sampleRows(a.rows, t).u > sampleRows(b.rows, t).u

  if (now !== lead) console.log(`${t.toFixed(2)} s: ${now ? a.code : b.code} leads`)

  lead = now
}

console.log(`${a.code} ${a.rows.length} rows, ${b.code} ${b.rows.length} rows`)

const out = arg('--out')

if (out) {
  writeFileSync(out, `${JSON.stringify(file)}\n`)
  console.log(`wrote ${out}`)
}
