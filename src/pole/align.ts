import type { LinePoint } from '#/circuits/registry.ts'

import type { CarSample, LocationSample, PoleRow } from './schema.ts'

type Input = {
  start: number
  time: number
  splits: readonly [number, number]
  car: ReadonlyArray<CarSample>
  location: ReadonlyArray<LocationSample>
  line: ReadonlyArray<LinePoint>
  cuts: readonly [number, number]
}

type Point = { x: number; y: number }

type Fit = { mirror: number; scale: number; cos: number; sin: number; from: Point; to: Point; rms: number }

const MIN_SAMPLES = 50
const MAX_MISS = 0.03
const MAX_RMS = 0.08
const SEARCH = 0.05

const wrapDiff = (d: number) => d - Math.round(d)

const wrap = (u: number) => u - Math.floor(u)

const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places

const resample = (points: ReadonlyArray<Point>, n: number): Point[] => {
  const along = [0]

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]

    along.push((along[i - 1] ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0))
  }

  const total = along.at(-1) ?? 0
  const out: Point[] = []
  let j = 1

  for (let i = 0; i < n; i++) {
    const want = (total * i) / n

    while (j < along.length - 1 && (along[j] ?? 0) < want) j++

    const a = points[j - 1]
    const b = points[j]
    const span = (along[j] ?? 0) - (along[j - 1] ?? 0)
    const f = span === 0 ? 0 : (want - (along[j - 1] ?? 0)) / span

    if (a && b) out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
  }

  return out
}

const centroid = (points: ReadonlyArray<Point>) => {
  const sum = points.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y }), { x: 0, y: 0 })

  return { x: sum.x / points.length, y: sum.y / points.length }
}

const fit = (track: ReadonlyArray<Point>, model: ReadonlyArray<Point>): Fit | null => {
  const n = model.length
  const to = centroid(model)
  const q = model.map((p) => ({ x: p.x - to.x, y: p.y - to.y }))
  const qq = q.reduce((s, p) => s + p.x * p.x + p.y * p.y, 0)
  let best: Fit | null = null

  for (const mirror of [1, -1]) {
    const mirrored = track.map((p) => ({ x: p.x * mirror, y: p.y }))
    const from = centroid(mirrored)
    const p = mirrored.map((m) => ({ x: m.x - from.x, y: m.y - from.y }))
    const pp = p.reduce((s, m) => s + m.x * m.x + m.y * m.y, 0)

    for (let k = 0; k < n; k++) {
      let a = 0
      let b = 0

      for (let i = 0; i < n; i++) {
        const u = p[i]
        const v = q[(i + k) % n]

        if (!u || !v) continue

        a += u.x * v.x + u.y * v.y
        b += u.x * v.y - u.y * v.x
      }

      const r = Math.hypot(a, b)
      const rms = Math.sqrt(Math.max(0, qq - (r * r) / pp) / n)

      if (!best || rms < best.rms) best = { mirror, scale: r / pp, cos: a / r, sin: b / r, from, to, rms }
    }
  }

  return best && best.rms / Math.sqrt(qq / n) <= MAX_RMS ? best : null
}

const apply = (f: Fit, p: Point): Point => {
  const x = p.x * f.mirror - f.from.x
  const y = p.y - f.from.y

  return { x: f.scale * (f.cos * x - f.sin * y) + f.to.x, y: f.scale * (f.sin * x + f.cos * y) + f.to.y }
}

const project = (model: ReadonlyArray<Point>, p: Point, near: number | null) => {
  const n = model.length
  const reach = near === null ? n : Math.ceil(SEARCH * n)
  const centre = near === null ? 0 : Math.floor(near * n)
  let best = { d: Infinity, u: 0 }

  for (let o = -reach; o <= reach; o++) {
    const j = (((centre + o) % n) + n) % n
    const a = model[j]
    const b = model[(j + 1) % n]

    if (!a || !b) continue

    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = dx * dx + dy * dy
    const f = len === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len))
    const d = Math.hypot(a.x + dx * f - p.x, a.y + dy * f - p.y)

    if (d < best.d) best = { d, u: (j + f) / n }
  }

  return best.u
}

const at = (ts: ReadonlyArray<number>, vs: ReadonlyArray<number>, t: number) => {
  let i = 1

  while (i < ts.length - 1 && (ts[i] ?? 0) < t) i++

  const t0 = ts[i - 1] ?? 0
  const t1 = ts[i] ?? t0
  const v0 = vs[i - 1] ?? 0
  const v1 = vs[i] ?? v0

  return t1 === t0 ? v0 : v0 + ((v1 - v0) * (t - t0)) / (t1 - t0)
}

export const alignLap = ({ start, time, splits, car, location, line, cuts }: Input): { rows: PoleRow[]; miss: number } | null => {
  if (car.length < MIN_SAMPLES || location.length < MIN_SAMPLES) return null

  const located = location.map((s) => ({ t: (Date.parse(s.date) - start) / 1000, x: s.x, y: s.y }))
  const inLap = located.filter((s) => s.t >= 0 && s.t <= time)
  const model = line.map((p) => ({ x: p.x, y: p.z }))
  const best = fit(resample(inLap, model.length), model)

  if (!best) return null

  const ts: number[] = []
  const raw: number[] = []

  for (const s of located) {
    const u = project(model, apply(best, s), raw.length === 0 ? null : wrap(raw.at(-1) ?? 0))
    const previous = raw.at(-1)
    const next = previous === undefined ? u : previous + wrapDiff(u - previous)

    ts.push(s.t)
    raw.push(previous === undefined ? next : Math.max(previous, next))
  }

  const lift = Math.floor(at(ts, raw, 0))
  const lifted = raw.map((u) => u - lift)
  const u0 = at(ts, lifted, 0)
  const into = (cut: number) => cut + Math.ceil(u0 - cut)
  const times = [0, splits[0], splits[1], time]
  const targets = [u0, into(cuts[0]), into(cuts[1]), u0 + 1]
  const anchors = times.map((t) => at(ts, lifted, t))
  const miss = Math.max(Math.abs((anchors[1] ?? 0) - (targets[1] ?? 0)), Math.abs((anchors[2] ?? 0) - (targets[2] ?? 0)))

  if (miss > MAX_MISS) return null

  const warp = (t: number) => {
    const j = t <= splits[0] ? 0 : t <= splits[1] ? 1 : 2
    const r0 = anchors[j] ?? 0
    const r1 = anchors[j + 1] ?? r0
    const g0 = targets[j] ?? 0
    const g1 = targets[j + 1] ?? g0

    return r1 === r0 ? g0 : g0 + ((at(ts, lifted, t) - r0) * (g1 - g0)) / (r1 - r0)
  }

  const timed = car.map((s) => ({ ...s, t: (Date.parse(s.date) - start) / 1000 }))
  const carTs = timed.map((s) => s.t)

  const value = (t: number) => {
    const nearest = timed.reduce((b, s) => (Math.abs(s.t - t) < Math.abs(b.t - t) ? s : b), timed[0] ?? { t, speed: 0, n_gear: 0, throttle: 0, brake: 0 })

    return {
      speed: at(carTs, timed.map((s) => s.speed), t),
      throttle: at(carTs, timed.map((s) => s.throttle), t),
      gear: nearest.n_gear,
      brake: nearest.brake,
    }
  }

  const row = (t: number, v: { speed: number; gear: number; throttle: number; brake: number }): PoleRow => [
    round(t, 3),
    round(warp(t), 5),
    Math.round(v.speed),
    Math.round(v.gear),
    Math.round(v.throttle),
    Math.round(Math.min(100, Math.max(0, v.brake))),
  ]

  const inside = timed.filter((s) => s.t > 0 && s.t < time).map((s) => row(s.t, { speed: s.speed, gear: s.n_gear, throttle: s.throttle, brake: s.brake }))

  const marks = times.map((t) => row(t, value(t)))

  return { rows: [...marks, ...inside].sort((x, y) => x[0] - y[0]), miss }
}
