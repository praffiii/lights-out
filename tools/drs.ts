import { writeFileSync } from 'node:fs'

import { Effect, Layer, Schema } from 'effect'
import { FetchHttpClient } from 'effect/http'

import pins from '../src/circuits/pins/us-2022.json'
import { circuitFor } from '../src/circuits/registry.ts'
import { ghostRows, lastOpen, matchLine, openingAt, type Sample } from '../src/drs/bake.ts'
import type { GhostFile, GhostRow } from '../src/drs/schema.ts'
import { alignLap } from '../src/pole/align.ts'
import { sampleRows, wrap } from '../src/pole/replay.ts'
import { OpenF1Client } from '../src/season/openf1-client.ts'

const SESSION = 10033
const DRIVER = 44
const LAPS = [53, 54] as const
const EDGE_MS = 1000
const BEFORE = 0.62
const AFTER = 0.92
const GAP_AT = 0.68
const GAP_MS = 6000

const arg = (name: string) => {
  const i = process.argv.indexOf(name)

  return i >= 0 ? process.argv[i + 1] : undefined
}

const info = circuitFor('miami')

if (!info) throw new Error('miami is not in the circuit registry')

const lengthM = Number(info.facts.lengthKm) * 1000
const iso = (ms: number) => new Date(ms).toISOString()
const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places
const decodeFlap = Schema.decodeUnknownSync(Schema.Array(Schema.Struct({ date: Schema.String, speed: Schema.Number, drs: Schema.Number })))

const flapData = async (from: number, to: number) => {
  const response = await fetch(`https://api.openf1.org/v1/car_data?session_key=${SESSION}&driver_number=${DRIVER}&date%3E=${iso(from)}&date%3C=${iso(to)}`)

  if (!response.ok) throw new Error(`car data answered ${response.status}`)

  return decodeFlap(await response.json())
}

const study = Effect.gen(function* () {
  const client = yield* OpenF1Client
  const drivers = yield* client.drivers(SESSION)
  const laps = yield* client.laps(SESSION, DRIVER)
  const who = drivers.find((d) => d.driver_number === DRIVER)

  if (!who) throw new Error('no driver')

  const runs = []

  for (const n of LAPS) {
    const lap = laps.find((l) => l.lap_number === n)
    const time = lap?.lap_duration
    const s1 = lap?.duration_sector_1
    const s2 = lap?.duration_sector_2

    if (!lap?.date_start || !time || !s1 || !s2) throw new Error(`lap ${n} has no times`)

    const start = Date.parse(lap.date_start)
    const car = yield* client.carData(SESSION, DRIVER, iso(start - EDGE_MS), iso(start + time * 1000 + EDGE_MS))
    const location = yield* client.location(SESSION, DRIVER, iso(start - EDGE_MS), iso(start + time * 1000 + EDGE_MS))
    const aligned = alignLap({ start, time, splits: [s1, s1 + s2], car, location, line: info.line, cuts: info.cuts })

    yield* Effect.sleep('1 second')

    const raw = yield* Effect.promise(() => flapData(start + time * BEFORE * 1000, start + time * AFTER * 1000))
    const samples: Sample[] = raw.map((s) => ({ t: (Date.parse(s.date) - start) / 1000, speed: s.speed, drs: s.drs }))
    const at = start + time * GAP_AT * 1000
    const near = yield* client.intervals(SESSION, DRIVER, iso(at - GAP_MS), iso(at + GAP_MS))
    const gap = near.flatMap((i) => (i.interval === null ? [] : [{ d: Math.abs(Date.parse(i.date) - at), v: i.interval }])).sort((a, b) => a.d - b.d)[0]?.v

    if (!aligned || gap === undefined) throw new Error(`lap ${n} does not align or has no gap`)

    runs.push({ lap: n, samples, rows: aligned.rows, gap })
  }

  const [on, off] = runs

  if (!on || !off) throw new Error('missing laps')

  const line = openingAt(on.samples)
  const last = lastOpen(on.samples)

  if (line === null || last === null || openingAt(off.samples) !== null) throw new Error('the flap data is not what the story needs')

  const open = wrap(sampleRows(on.rows, line).u)
  const tidy = (rows: ReadonlyArray<GhostRow>) => rows.map((r): GhostRow => [round(r[0], 3), round(r[1], 6), round(r[2], 1)])

  const file: GhostFile = {
    session: SESSION,
    race: 'Miami',
    year: 2025,
    driver: { code: who.name_acronym, name: `${who.first_name} ${who.last_name}`, team: who.team_name },
    lengthM,
    open: round(open, 5),
    from: pins.laps['16'],
    to: pins.laps['17'],
    end: round(last - line, 3),
    laps: [
      { lap: on.lap, gap: round(on.gap, 2), rows: tidy(ghostRows(on.samples, line, open, lengthM)) },
      { lap: off.lap, gap: round(off.gap, 2), rows: tidy(ghostRows(off.samples, matchLine(on.samples, line, off.samples), open, lengthM)) },
    ],
  }

  return file
})

const file = await Effect.runPromise(study.pipe(Effect.provide(OpenF1Client.layer.pipe(Layer.provide(FetchHttpClient.layer)))))

console.log(`open u ${file.open}, end ${file.end} s, gaps ${file.laps[0].gap} and ${file.laps[1].gap}, rows ${file.laps[0].rows.length} and ${file.laps[1].rows.length}`)

const out = arg('--out')

if (out) writeFileSync(out, `${JSON.stringify(file)}\n`)
