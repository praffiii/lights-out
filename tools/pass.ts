import { writeFileSync } from 'node:fs'

import { Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/http'

import { allCircuits } from '../src/circuits/registry.ts'
import { MARKS } from '../src/pass/interlagos.ts'
import { brakeOnset, CAR_M, crossTime } from '../src/pass/model.ts'
import { best, type Candidate, reject } from '../src/pass/pick.ts'
import type { PassFile } from '../src/pass/schema.ts'
import { alignLap } from '../src/pole/align.ts'
import { sampleRows } from '../src/pole/replay.ts'
import type { OpenF1Lap, PoleRow, Stint } from '../src/pole/schema.ts'
import { OpenF1Client } from '../src/season/openf1-client.ts'

const SESSION = 11412
const RACE = 'São Paulo'
const YEAR = 2026
const AFTER_LINE: readonly [number, number] = [0.5, 9]
const SLICKS = new Set(['SOFT', 'MEDIUM', 'HARD'])
const EDGE_MS = 1000
const LEAD_IN = 1
const LEAD_OUT = 0.5
const INTERVAL_REACH = 5

const arg = (name: string) => {
  const i = process.argv.indexOf(name)

  return i >= 0 ? process.argv[i + 1] : undefined
}

const info = allCircuits().find((c) => c.model === 'br-1940')

if (!info) throw new Error('br-1940 is not in the circuit registry')

const lengthM = Number(info.facts.lengthKm) * 1000
const iso = (ms: number) => new Date(ms).toISOString()
const ms = (date: string) => Date.parse(date)

const lapAt = (laps: ReadonlyArray<OpenF1Lap>, at: number) =>
  laps.filter((l) => l.date_start !== null && ms(l.date_start) <= at).reduce<OpenF1Lap | null>((b, l) => (b === null || l.lap_number > b.lap_number ? l : b), null)

const aligned = (driver: number, lap: OpenF1Lap) =>
  OpenF1Client.use((client) =>
    Effect.gen(function* () {
      const s1 = lap.duration_sector_1
      const s2 = lap.duration_sector_2
      const time = lap.lap_duration

      if (!lap.date_start || s1 === null || s2 === null || time === null) return null

      const start = ms(lap.date_start)
      const car = yield* client.carData(SESSION, driver, iso(start - EDGE_MS), iso(start + time * 1000 + EDGE_MS))
      const location = yield* client.location(SESSION, driver, iso(start - EDGE_MS), iso(start + time * 1000 + EDGE_MS))
      const fit = alignLap({ start, time, splits: [s1, s1 + s2], car, location, line: info.line, cuts: info.cuts })

      const lift = Math.round(fit?.rows[0]?.[1] ?? 0)

      return fit ? { start, rows: fit.rows.map((r): PoleRow => [r[0], r[1] - lift, r[2], r[3], r[4], r[5]]) } : null
    }),
  )

const joined = (driver: number, laps: ReadonlyArray<OpenF1Lap>, n: number) =>
  Effect.gen(function* () {
    const before = laps.find((l) => l.lap_number === n - 1)
    const lap = laps.find((l) => l.lap_number === n)

    if (!before || !lap) return null

    const a = yield* aligned(driver, before)
    const b = yield* aligned(driver, lap)

    if (!a || !b) return null

    const shift = (b.start - a.start) / 1000
    const tail = b.rows.map((r): PoleRow => [r[0] + shift, r[1] + 1, r[2], r[3], r[4], r[5]])

    return { start: a.start, rows: [...a.rows.filter((r) => r[0] < shift), ...tail] }
  })

const onClock = (rows: ReadonlyArray<PoleRow>, from: number): PoleRow[] => rows.map((r) => [r[0] + from, r[1], r[2], r[3], r[4], r[5]])

const levelAt = (chaser: ReadonlyArray<PoleRow>, leader: ReadonlyArray<PoleRow>, from: number) => {
  for (const r of chaser) {
    if (r[0] < from) continue

    if ((sampleRows(leader, r[0]).u - r[1]) * lengthM <= CAR_M) return r[0]
  }

  return null
}

const study = Effect.gen(function* () {
  const client = yield* OpenF1Client
  const drivers = yield* client.drivers(SESSION)
  const pits = yield* client.pits(SESSION)
  const overtakes = yield* client.overtakes(SESSION)
  const lapsOf = new Map<number, ReadonlyArray<OpenF1Lap>>()
  const stintsOf = new Map<number, ReadonlyArray<Stint>>()

  const laps = (driver: number) =>
    Effect.gen(function* () {
      const known = lapsOf.get(driver)

      if (known) return known

      const fetched = yield* client.laps(SESSION, driver)

      lapsOf.set(driver, fetched)

      return fetched
    })

  const slicks = (driver: number, n: number) =>
    Effect.gen(function* () {
      const known = stintsOf.get(driver) ?? (yield* client.stints(SESSION, driver))

      stintsOf.set(driver, known)

      return known.some((s) => (s.lap_start ?? Infinity) <= n && n <= (s.lap_end ?? -Infinity) && SLICKS.has(s.compound ?? ''))
    })

  const team = (driver: number) => drivers.find((d) => d.driver_number === driver)?.team_name ?? `#${driver}`

  const results: Array<{ candidate: Candidate; label: string; pass: PassFile | null }> = []

  for (const o of overtakes) {
    const at = ms(o.date)
    const chaserLaps = yield* laps(o.overtaking_driver_number)
    const lap = lapAt(chaserLaps, at)

    if (!lap?.date_start) continue

    const since = (at - ms(lap.date_start)) / 1000

    if (since < AFTER_LINE[0] || since > AFTER_LINE[1]) continue

    const n = lap.lap_number
    const leaderLaps = yield* laps(o.overtaken_driver_number)
    const leaderLap = lapAt(leaderLaps, at)
    const code = (d: number) => drivers.find((x) => x.driver_number === d)?.name_acronym ?? `#${d}`
    const label = `lap ${n} · ${code(o.overtaking_driver_number)} on ${code(o.overtaken_driver_number)} for P${o.position}`

    const side = (driver: number, m: number) =>
      Effect.gen(function* () {
        return { number: driver, team: team(driver), pitted: pits.some((p) => p.driver_number === driver && (p.lap_number === m || p.lap_number === m - 1)), slicks: yield* slicks(driver, m) }
      })

    const chaserSide = yield* side(o.overtaking_driver_number, n)
    const leaderSide = yield* side(o.overtaken_driver_number, leaderLap?.lap_number ?? n)
    const base: Candidate = { lap: n, position: o.position, chaser: chaserSide, leader: leaderSide, gapAtDetection: null, intervalNear: null, levelT: null, brakeT: null, brakeGapM: null, aligned: false }
    const early = reject({ ...base, gapAtDetection: 0, intervalNear: 0, levelT: 0, brakeT: { chaser: 1, leader: 0 }, brakeGapM: Infinity, aligned: true })

    if (early) {
      results.push({ candidate: base, label, pass: null })
      continue
    }

    const c = yield* joined(o.overtaking_driver_number, chaserLaps, n)
    const l = leaderLap ? yield* joined(o.overtaken_driver_number, leaderLaps, leaderLap.lap_number) : null

    if (!c || !l) {
      results.push({ candidate: base, label, pass: null })
      continue
    }

    const origin = Math.min(c.start, l.start)
    const chaser = onClock(c.rows, (c.start - origin) / 1000)
    const leader = onClock(l.rows, (l.start - origin) / 1000)
    const detC = crossTime(chaser, MARKS.detection)
    const detL = crossTime(leader, MARKS.detection)
    const apex = crossTime(chaser, MARKS.apex)
    const gap = detC !== null && detL !== null ? detC - detL : null
    const near = detC === null ? [] : yield* client.intervals(SESSION, o.overtaking_driver_number, iso(origin + (detC - INTERVAL_REACH) * 1000), iso(origin + (detC + INTERVAL_REACH) * 1000))
    const interval = near.flatMap((i) => (i.interval === null ? [] : [{ d: Math.abs(ms(i.date) - (origin + (detC ?? 0) * 1000)), v: i.interval }])).sort((a, b) => a.d - b.d)[0]?.v ?? null
    const bc = brakeOnset(chaser, 1, MARKS.apex)
    const bl = brakeOnset(leader, 1, MARKS.apex)

    const candidate: Candidate = {
      ...base,
      gapAtDetection: gap,
      intervalNear: interval,
      levelT: detC === null ? null : levelAt(chaser, leader, detC),
      brakeT: bc && bl ? { chaser: bc.t, leader: bl.t } : null,
      brakeGapM: bc && bl ? (bc.u - bl.u) * lengthM : null,
      aligned: true,
    }

    if (detC === null || apex === null) {
      results.push({ candidate: { ...candidate, aligned: false }, label, pass: null })
      continue
    }

    const from = detC - LEAD_IN
    const to = apex + LEAD_OUT
    const cut = (rows: ReadonlyArray<PoleRow>) => rows.flatMap((r): PoleRow[] => (r[0] >= from && r[0] <= to ? [[Math.round((r[0] - from) * 1000) / 1000, r[1], r[2], r[3], r[4], r[5]]] : []))

    const car = (d: number, rows: ReadonlyArray<PoleRow>) => {
      const x = drivers.find((y) => y.driver_number === d)

      return { code: x?.name_acronym ?? `#${d}`, name: x ? `${x.first_name} ${x.last_name}` : `#${d}`, team: team(d), rows: cut(rows) }
    }

    results.push({
      candidate,
      label,
      pass: { session: SESSION, race: RACE, year: YEAR, lap: n, position: o.position, lengthM, chaser: car(o.overtaking_driver_number, chaser), leader: car(o.overtaken_driver_number, leader) },
    })
  }

  return results
})

const services = OpenF1Client.layer.pipe(Layer.provide(FetchHttpClient.layer))
const results = await Effect.runPromise(study.pipe(Effect.provide(services)))

for (const { candidate: c, label } of results) {
  const numbers = c.gapAtDetection === null ? '' : ` · det ${c.gapAtDetection.toFixed(2)} s · int ${c.intervalNear?.toFixed(2) ?? '—'} · level ${c.levelT?.toFixed(1) ?? '—'} · brake +${c.brakeGapM?.toFixed(0) ?? '—'} m`

  console.log(`${label}${numbers} → ${reject(c) ?? 'ok'}`)
}

const top = best(results.map((r) => r.candidate))
const out = arg('--out')
const lap = Number(arg('--lap'))
const chosen = out ? results.find((r) => r.pass && r.candidate.lap === lap && r.candidate.chaser.number === Number(arg('--chaser')) && r.candidate.leader.number === Number(arg('--leader'))) : undefined

console.log(top ? `best: lap ${top.lap} P${top.position}` : 'best: none')

if (out && chosen?.pass) {
  writeFileSync(out, `${JSON.stringify(chosen.pass)}\n`)
  console.log(`wrote ${out}`)
} else if (out) {
  console.error('no aligned pass matches --lap --chaser --leader')
  process.exit(1)
}
