import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { Option, Schema } from 'effect'

import { type GainFile, median, pairs, type Pass } from '../src/drs/gain.ts'

const STRAIGHTS = [
  { session: 9912, race: 'Monza', straight: 'Main straight', from: 0, to: 0.17, before: 5 },
  { session: 9858, race: 'Las Vegas', straight: 'First zone', from: 0.08, to: 0.27, before: 3 },
  { session: 9912, race: 'Monza', straight: 'Before Ascari', from: 0.54, to: 0.72, before: 3 },
  { session: 10033, race: 'Miami', straight: 'The last long straight', from: 0.7, to: 0.88, before: 3 },
] as const

const FIRST_LAP = 4
const SLOW = 1.06
const MIN_SAMPLES = 8
const GAP_REACH = 6
const OPEN = 10
const SPACING_MS = 1100

const Laps = Schema.Array(Schema.Struct({ driver_number: Schema.Number, lap_number: Schema.Number, date_start: Schema.NullOr(Schema.String), lap_duration: Schema.NullOr(Schema.Number), is_pit_out_lap: Schema.Boolean }))
const Intervals = Schema.Array(Schema.Struct({ driver_number: Schema.Number, date: Schema.String, interval: Schema.NullOr(Schema.Union([Schema.Number, Schema.String])) }))
const Drivers = Schema.Array(Schema.Struct({ driver_number: Schema.Number }))
const Cars = Schema.Array(Schema.Struct({ date: Schema.String, speed: Schema.Number, drs: Schema.Number }))
const Seconds = Schema.decodeUnknownOption(Schema.Number)

const arg = (name: string) => {
  const i = process.argv.indexOf(name)

  return i >= 0 ? process.argv[i + 1] : undefined
}

const cache = arg('--cache')

if (cache) mkdirSync(cache, { recursive: true })

const read = async (path: string): Promise<string> => {
  const url = `https://api.openf1.org/v1/${path}`
  const file = cache ? `${cache}/${createHash('md5').update(url).digest('hex')}.json` : null

  if (file && existsSync(file)) return readFileSync(file, 'utf8')

  await Bun.sleep(SPACING_MS)

  const response = await fetch(url)

  if (!response.ok) throw new Error(`${path} answered ${response.status}`)

  const text = await response.text()

  if (file) writeFileSync(file, text)

  return text
}

const seconds = (date: string) => Date.parse(date) / 1000

const load = async (session: number) => {
  const laps = Schema.decodeUnknownSync(Schema.fromJsonString(Laps))(await read(`laps?session_key=${session}`))
  const intervals = Schema.decodeUnknownSync(Schema.fromJsonString(Intervals))(await read(`intervals?session_key=${session}`))
  const drivers = Schema.decodeUnknownSync(Schema.fromJsonString(Drivers))(await read(`drivers?session_key=${session}`))
  const cars = new Map<number, ReadonlyArray<{ t: number; speed: number; drs: number }>>()

  for (const { driver_number: driver } of drivers) {
    const rows = Schema.decodeUnknownSync(Schema.fromJsonString(Cars))(await read(`car_data?session_key=${session}&driver_number=${driver}`))

    cars.set(driver, rows.map((r) => ({ t: seconds(r.date), speed: r.speed, drs: r.drs })).sort((a, b) => a.t - b.t))
  }

  const gaps = new Map<number, Array<{ t: number; gap: number }>>()

  for (const row of intervals) {
    const gap = Seconds(row.interval)

    if (Option.isSome(gap)) gaps.set(row.driver_number, [...(gaps.get(row.driver_number) ?? []), { t: seconds(row.date), gap: gap.value }])
  }

  return { laps, cars, gaps }
}

type Session = Awaited<ReturnType<typeof load>>

const passes = ({ laps, cars, gaps }: Session, { from, to, before }: (typeof STRAIGHTS)[number]): ReadonlyArray<Pass> => {
  const usual = median(laps.flatMap((l) => (l.lap_duration ? [l.lap_duration] : [])))

  return laps.flatMap((l) => {
    const time = l.lap_duration

    if (!l.date_start || !time || l.lap_number < FIRST_LAP || l.is_pit_out_lap || time > SLOW * usual) return []

    const start = seconds(l.date_start)
    const samples = (cars.get(l.driver_number) ?? []).filter((s) => s.t >= start + from * time && s.t < start + to * time)
    const at = start + from * time - before

    const gap = (gaps.get(l.driver_number) ?? []).reduce<{ d: number; gap: number } | null>((best, g) => {
      const d = Math.abs(g.t - at)

      return d < GAP_REACH && (!best || d < best.d) ? { d, gap: g.gap } : best
    }, null)

    if (samples.length < MIN_SAMPLES || !gap) return []

    return [{ driver: l.driver_number, lap: l.lap_number, gap: gap.gap, open: samples.filter((s) => s.drs >= OPEN).length, top: Math.max(...samples.map((s) => s.speed)) }]
  })
}

const sessions = new Map<number, Session>()
const rows: Array<GainFile[number]> = []

for (const straight of STRAIGHTS) {
  const session = sessions.get(straight.session) ?? (await load(straight.session))

  sessions.set(straight.session, session)

  const diffs = pairs(passes(session, straight))

  rows.push({ race: straight.race, straight: straight.straight, pairs: diffs.length, gain: median(diffs) })
}

console.log(rows.map((r) => `${r.race}, ${r.straight}: ${r.pairs} pairs, +${r.gain}`).join('\n'))

const out = arg('--out')

if (out) writeFileSync(out, `${JSON.stringify(rows)}\n`)
