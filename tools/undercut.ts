import { writeFileSync } from 'node:fs'

import { Effect, Layer, Schema } from 'effect'
import { FetchHttpClient } from 'effect/http'

import { circuitFor } from '../src/circuits/registry.ts'
import { crossTime } from '../src/pass/model.ts'
import { apply, type Fit, fit, project, resample } from '../src/pole/align.ts'
import type { LocationSample, OpenF1Lap, Stint } from '../src/pole/schema.ts'
import { OpenF1Client } from '../src/season/openf1-client.ts'
import { Compound, type UndercutCar, type UndercutFile } from '../src/tyres/schema.ts'

const SESSION = 11280
const EARLY = 12
const LATE = 1
const FIT_LAPS = [2, 25] as const
const LEAD_IN = 15
const LEAD_OUT = 30
const MAX_RMS_M = 10
const LANE_M = 12
const PIT_REACH = 40
const FETCH_REACH = 120
const POSITIONS_REACH = 7_200_000
const PATH_POINTS = 60
const SWING_INSET = 0.01

type Point = { x: number; y: number }

type Row = [t: number, u: number, lane: number]

type Located = { t: number; p: Point; u: number; d: number }

const arg = (name: string) => {
  const i = process.argv.indexOf(name)

  return i >= 0 ? process.argv[i + 1] : undefined
}

const info = circuitFor('miami')

if (!info) throw new Error('miami is not in the circuit registry')

const model = info.line.map((p) => ({ x: p.x, y: p.z }))

const perimeter = model.reduce((s, p, i) => {
  const q = model[(i + 1) % model.length] ?? p

  return s + Math.hypot(q.x - p.x, q.y - p.y)
}, 0)

const lengthM = Number(info.facts.lengthKm) * 1000
const metresPerUnit = lengthM / perimeter
const ms = (date: string) => Date.parse(date)
const iso = (at: number) => new Date(at).toISOString()
const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places

const onLine = (u: number): Point => {
  const f = (((u % 1) + 1) % 1) * model.length
  const i = Math.floor(f)
  const a = model[i % model.length] ?? { x: 0, y: 0 }
  const b = model[(i + 1) % model.length] ?? a

  return { x: a.x + (b.x - a.x) * (f - i), y: a.y + (b.y - a.y) * (f - i) }
}

const heightAt = (p: Point) => {
  const u = project(model, p, null)

  return info.line[Math.round(u * info.line.length) % info.line.length]?.y ?? 0
}

const locate = (best: Fit, samples: ReadonlyArray<LocationSample>, origin: number): Located[] => {
  const out: Located[] = []

  for (const s of samples) {
    const p = apply(best, { x: s.x, y: s.y })
    const previous = out.at(-1)
    const u = project(model, p, previous ? previous.u - Math.floor(previous.u) : null)
    const q = onLine(u)
    const d = Math.hypot(q.x - p.x, q.y - p.y) * metresPerUnit

    if (!previous) {
      out.push({ t: (ms(s.date) - origin) / 1000, p, u, d })
      continue
    }

    const wrapped = previous.u - Math.floor(previous.u)
    const step = u - wrapped - Math.round(u - wrapped)

    out.push({ t: (ms(s.date) - origin) / 1000, p, u: Math.max(previous.u, previous.u + step), d })
  }

  return out
}

const crossing = (a: Located, b: Located) => (b.d === a.d ? a.t : a.t + ((LANE_M - a.d) * (b.t - a.t)) / (b.d - a.d))

const laneOf = (track: ReadonlyArray<Located>, pitT: number) => {
  const near = track.reduce((best, s, i) => (s.d > LANE_M && Math.abs(s.t - pitT) < Math.abs((track[best]?.t ?? Infinity) - pitT) ? i : best), -1)

  if (near < 0) return null

  let first = near
  let last = near

  while (first > 0 && (track[first - 1]?.d ?? 0) > LANE_M && pitT - (track[first - 1]?.t ?? 0) < PIT_REACH) first--

  while (last < track.length - 1 && (track[last + 1]?.d ?? 0) > LANE_M && (track[last + 1]?.t ?? 0) - pitT < PIT_REACH) last++

  const before = track[first - 1]
  const inFirst = track[first]
  const inLast = track[last]
  const after = track[last + 1]

  if (!before || !inFirst || !inLast || !after) return null

  return { first, last, entry: crossing(before, inFirst), exit: crossing(inLast, after) }
}

const along = (points: ReadonlyArray<Point>) => {
  const s = [0]

  for (const [i, p] of points.entries()) {
    const q = points[i - 1]

    if (q) s.push((s.at(-1) ?? 0) + Math.hypot(p.x - q.x, p.y - q.y))
  }

  return s
}

const resampleOpen = (points: ReadonlyArray<Point>, n: number): Point[] => {
  const s = along(points)
  const total = s.at(-1) ?? 0

  return Array.from({ length: n }, (_, i) => {
    const want = (total * i) / (n - 1)
    let j = 1

    while (j < s.length - 1 && (s[j] ?? 0) < want) j++

    const a = points[j - 1] ?? { x: 0, y: 0 }
    const b = points[j] ?? a
    const span = (s[j] ?? 0) - (s[j - 1] ?? 0)
    const f = span === 0 ? 0 : (want - (s[j - 1] ?? 0)) / span

    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
  })
}

const fractionOn = (path: ReadonlyArray<Point>, p: Point) => {
  const s = along(path)
  const total = s.at(-1) ?? 1
  let best = { d: Infinity, f: 0 }

  for (let j = 1; j < path.length; j++) {
    const a = path[j - 1] ?? p
    const b = path[j] ?? a
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = dx * dx + dy * dy
    const k = len === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len))
    const d = Math.hypot(a.x + dx * k - p.x, a.y + dy * k - p.y)

    if (d < best.d) best = { d, f: ((s[j - 1] ?? 0) + k * Math.sqrt(len)) / total }
  }

  return best.f
}

const lapBefore = (laps: ReadonlyArray<OpenF1Lap>, at: number) =>
  laps.filter((l) => l.date_start !== null && ms(l.date_start) <= at).reduce<OpenF1Lap | null>((b, l) => (b === null || l.lap_number > b.lap_number ? l : b), null)

const isCompound = Schema.is(Compound)

const bake = Effect.gen(function* () {
  const client = yield* OpenF1Client
  const drivers = yield* client.drivers(SESSION)
  const pits = yield* client.pits(SESSION)
  const lapsOf = { early: yield* client.laps(SESSION, EARLY), late: yield* client.laps(SESSION, LATE) }
  const stintsOf = { early: yield* client.stints(SESSION, EARLY), late: yield* client.stints(SESSION, LATE) }
  const pitOf = { early: pits.find((p) => p.driver_number === EARLY), late: pits.find((p) => p.driver_number === LATE) }

  if (!pitOf.early || !pitOf.late) return yield* Effect.die('a pit record is missing')

  const fits: Fit[] = []

  for (const [number, laps] of [[EARLY, lapsOf.early], [LATE, lapsOf.late]] as const) {
    for (const lap of laps) {
      if (lap.lap_number < FIT_LAPS[0] || lap.lap_number > FIT_LAPS[1] || !lap.date_start || lap.lap_duration === null) continue

      const lapStart = ms(lap.date_start)
      const trace = yield* client.location(SESSION, number, iso(lapStart), iso(lapStart + lap.lap_duration * 1000))

      const tried = fit(
        resample(
          trace.map((x) => ({ x: x.x, y: x.y })),
          model.length,
        ),
        model,
      )

      if (tried) fits.push(tried)
    }
  }

  const best = fits.reduce<Fit | null>((b, f) => (b === null || f.rms < b.rms ? f : b), null)
  const rmsM = best ? best.rms * metresPerUnit : Infinity

  console.log(`fit rms ${rmsM.toFixed(1)} m, best of ${fits.length} laps (limit ${MAX_RMS_M} m)`)

  if (!best || rmsM > MAX_RMS_M) return yield* Effect.die('no clean lap fits the layout')

  const from = ms(pitOf.early.date) - FETCH_REACH * 1000
  const to = ms(pitOf.late.date) + FETCH_REACH * 1000
  const raw = { early: yield* client.location(SESSION, EARLY, iso(from), iso(to)), late: yield* client.location(SESSION, LATE, iso(from), iso(to)) }
  const located = { early: locate(best, raw.early, from), late: locate(best, raw.late, from) }

  const lanes = {
    early: laneOf(located.early, (ms(pitOf.early.date) - from) / 1000),
    late: laneOf(located.late, (ms(pitOf.late.date) - from) / 1000),
  }

  if (!lanes.early || !lanes.late) return yield* Effect.die('a car never left the racing line near its stop')

  const start = lanes.early.entry - LEAD_IN
  const end = lanes.late.exit + LEAD_OUT

  for (const which of ['early', 'late'] as const) {
    const lane = lanes[which]

    console.log(`${which}: lane ${lane?.entry.toFixed(1)}–${lane?.exit.toFixed(1)} s (${((lane?.exit ?? 0) - (lane?.entry ?? 0)).toFixed(1)} s by location, ${pitOf[which]?.lane_duration ?? '—'} s by the pit record)`)
  }

  const trace = (which: 'early' | 'late') => {
    const lane = lanes[which]

    return lane ? resampleOpen(located[which].slice(lane.first, lane.last + 1).map((s) => s.p), PATH_POINTS) : []
  }

  const a = trace('early')
  const b = trace('late')
  const path = a.map((p, i) => ({ x: (p.x + (b[i]?.x ?? p.x)) / 2, y: (p.y + (b[i]?.y ?? p.y)) / 2 }))
  const middle = path[Math.floor(PATH_POINTS / 2)] ?? { x: 0, y: 0 }

  const lift = (which: 'early' | 'late') => {
    const laps = lapsOf[which]
    const anchor = lapBefore(laps, from + start * 1000)

    if (!anchor?.date_start) return 0

    const t = (ms(anchor.date_start) - from) / 1000
    const track = located[which]
    const i = track.findIndex((s) => s.t >= t)
    const s0 = track[i - 1] ?? track[i]
    const s1 = track[i] ?? s0
    const u = s0 && s1 ? (s1.t === s0.t ? s0.u : s0.u + ((s1.u - s0.u) * (t - s0.t)) / (s1.t - s0.t)) : 0

    return anchor.lap_number - 1 - u
  }

  const rowsOf = (which: 'early' | 'late'): Row[] => {
    const lane = lanes[which]
    const shift = lift(which)

    return located[which].flatMap((s, i): Row[] => {
      if (s.t < start || s.t > end) return []

      const inLane = lane !== null && i >= lane.first && i <= lane.last

      return [[round(s.t - start, 3), round(s.u + shift, 5), inLane ? round(fractionOn(path, s.p), 3) : -1]]
    })
  }

  const stintRows = (stints: ReadonlyArray<Stint>) =>
    stints.flatMap((s) => (s.compound !== null && isCompound(s.compound) && s.lap_start !== null ? [{ compound: s.compound, lapStart: s.lap_start, ageAtStart: s.tyre_age_at_start ?? 0 }] : []))

  const car = (which: 'early' | 'late', number: number): UndercutCar => {
    const d = drivers.find((x) => x.driver_number === number)
    const lane = lanes[which]
    const pit = pitOf[which]

    const laps = lapsOf[which].flatMap((l): Array<[number, number]> => {
      const at = l.date_start ? (ms(l.date_start) - from) / 1000 - start : null

      return at !== null && at > -FETCH_REACH && at <= end - start ? [[l.lap_number, round(at, 3)]] : []
    })

    return {
      number,
      code: d?.name_acronym ?? `#${number}`,
      name: d ? `${d.first_name} ${d.last_name}` : `#${number}`,
      team: d?.team_name ?? '',
      rows: rowsOf(which),
      laps,
      stints: stintRows(stintsOf[which]),
      stop: {
        lap: pit?.lap_number ?? 0,
        entry: round((lane?.entry ?? 0) - start, 3),
        exit: round((lane?.exit ?? 0) - start, 3),
        stopS: pit?.stop_duration ?? 0,
        laneS: pit?.lane_duration ?? 0,
      },
    }
  }

  const windowFrom = from + start * 1000
  const windowTo = from + end * 1000
  const placed = [...(yield* client.positions(SESSION, EARLY, iso(windowFrom - POSITIONS_REACH), iso(windowTo))), ...(yield* client.positions(SESSION, LATE, iso(windowFrom - POSITIONS_REACH), iso(windowTo)))]

  const positions = [EARLY, LATE]
    .flatMap((number) => {
      const mine = placed.filter((p) => p.driver_number === number).sort((x, y) => ms(x.date) - ms(y.date))
      const opening = mine.filter((p) => ms(p.date) <= windowFrom).at(-1)
      const inside = mine.filter((p) => ms(p.date) > windowFrom)

      return [...(opening ? [{ ...opening, date: iso(windowFrom) }] : []), ...inside].map((p): [number, number, number] => [round((ms(p.date) - windowFrom) / 1000, 3), number, p.position])
    })
    .sort((x, y) => x[0] - y[0])

  const file: UndercutFile = {
    session: SESSION,
    race: 'Miami',
    year: 2026,
    totalLaps: info.facts.laps,
    lengthM,
    pit: {
      points: path.map((p): [number, number, number] => [round(p.x, 2), round(heightAt(p), 2), round(p.y, 2)]),
      u: round(project(model, middle, null), 5),
    },
    positions,
    early: car('early', EARLY),
    late: car('late', LATE),
  }

  return file
})

const services = OpenF1Client.layer.pipe(Layer.provide(FetchHttpClient.layer))
const file = await Effect.runPromise(bake.pipe(Effect.provide(services)))

const swingFrom = Math.max(file.early.rows[0]?.[1] ?? 0, file.late.rows[0]?.[1] ?? 0) + SWING_INSET
const swingTo = Math.min(file.early.rows.at(-1)?.[1] ?? 0, file.late.rows.at(-1)?.[1] ?? 0) - SWING_INSET

const gapAt = (u: number) => {
  const e = crossTime(file.early.rows, u)
  const l = crossTime(file.late.rows, u)

  return e === null || l === null ? null : e - l
}

const before = gapAt(swingFrom)
const after = gapAt(swingTo)
const laneDiff = file.late.stop.laneS - file.early.stop.laneS
const stopDiff = file.late.stop.stopS - file.early.stop.stopS

console.log(`gap at u ${swingFrom.toFixed(2)}: ${before?.toFixed(2) ?? '—'} s (early behind when positive)`)

console.log(`gap at u ${swingTo.toFixed(2)}: ${after?.toFixed(2) ?? '—'} s`)

if (before === null || after === null) {
  console.error('the window does not cover both swing points')
  process.exit(1)
}

console.log(`swing ${(before - after).toFixed(2)} s · lane +${laneDiff.toFixed(2)} s for the late car · stop +${stopDiff.toFixed(2)} s · remainder ${(before - after - laneDiff).toFixed(2)} s`)

const holds = laneDiff > 0 && after < 0

console.log(holds ? 'story holds: the early car is ahead after, and the late car lost more in the lane' : 'story FAILS: bring the numbers to Praffi')

const out = arg('--out')

if (!holds) process.exit(1)

if (out) {
  writeFileSync(out, `${JSON.stringify(file)}\n`)
  console.log(`wrote ${out}`)
}
