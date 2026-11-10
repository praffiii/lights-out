import type { PoleLap, PoleRow } from './schema.ts'

type Turn = { turn: number; u: number }

const HOLD = 1.6
const MAX_STEP = 0.1
const APEX_REACH = 0.02

const wrap = (u: number) => u - Math.floor(u)

const wrapDiff = (d: number) => d - Math.round(d)

const after = (rows: ReadonlyArray<PoleRow>, pick: (row: PoleRow) => number, value: number) => {
  let lo = 1
  let hi = rows.length - 1

  while (lo < hi) {
    const mid = (lo + hi) >> 1
    const row = rows[mid]

    if (row && pick(row) < value) lo = mid + 1
    else hi = mid
  }

  return lo
}

const mix = (a: number, b: number, f: number) => a + (b - a) * f

export const sampleAt = (lap: PoleLap, t: number) => {
  const time = Math.min(lap.time, Math.max(0, t))
  const i = after(lap.rows, (row) => row[0], time)
  const a = lap.rows[i - 1] ?? lap.rows[0]
  const b = lap.rows[i] ?? a

  if (!a || !b) return { u: 0, speed: 0, gear: 0, throttle: 0, brake: 0 }

  const f = b[0] === a[0] ? 0 : (time - a[0]) / (b[0] - a[0])
  const near = f < 0.5 ? a : b

  return { u: wrap(mix(a[1], b[1], f)), speed: mix(a[2], b[2], f), gear: near[3], throttle: mix(a[4], b[4], f), brake: near[5] }
}

export const timeAt = (lap: PoleLap, u: number) => {
  const u0 = lap.rows[0]?.[1] ?? 0
  const target = u + Math.ceil(u0 - u)
  const i = after(lap.rows, (row) => row[1], target)
  const a = lap.rows[i - 1]
  const b = lap.rows[i] ?? a

  if (!a || !b) return 0

  return b[1] === a[1] ? a[0] : mix(a[0], b[0], (target - a[1]) / (b[1] - a[1]))
}

export const splits = (lap: PoleLap, t: number) => {
  const [s1, s2, s3] = lap.sectors
  const ends = [s1, s1 + s2, lap.time]

  return [s1, s2, s3].map((sector, i) => {
    const end = ends[i] ?? lap.time
    const start = end - sector

    if (t >= end) return { state: 'done' as const, text: sector.toFixed(3) }

    if (t >= start) return { state: 'live' as const, text: (t - start).toFixed(1) }

    return { state: 'idle' as const, text: '—' }
  })
}

export const clock = (t: number) => {
  const ms = Math.round(t * 1000)
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)

  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`
}

export const apexes = (lap: PoleLap, turns: ReadonlyArray<Turn>) => {
  const out = new Map<number, { speed: number; gear: number }>()

  for (const { turn, u } of turns) {
    const slowest = lap.rows.filter((row) => Math.abs(wrapDiff(row[1] - u)) <= APEX_REACH).reduce<PoleRow | null>((slow, row) => (!slow || row[2] < slow[2] ? row : slow), null)

    if (slowest) out.set(turn, { speed: slowest[2], gear: slowest[3] })
  }

  return out
}

export const advance = (state: { t: number; hold: number }, dtSeconds: number, time: number) => {
  const step = Math.min(MAX_STEP, Math.max(0, dtSeconds))

  if (state.hold > 0) return state.hold - step <= 1e-9 ? { t: 0, hold: 0 } : { t: time, hold: state.hold - step }

  const t = state.t + step

  return t >= time ? { t: time, hold: HOLD } : { t, hold: 0 }
}

const pointAt = (trace: Float32Array, u: number) => {
  const n = trace.length / 2
  const at = wrap(u) * n
  const i = Math.floor(at) % n
  const j = (i + 1) % n
  const f = at - Math.floor(at)

  return { x: mix(trace[i * 2] ?? 0, trace[j * 2] ?? 0, f), y: mix(trace[i * 2 + 1] ?? 0, trace[j * 2 + 1] ?? 0, f) }
}

export const nearest = (trace: Float32Array, x: number, y: number, maxPx: number) => {
  const n = trace.length / 2
  let best = { d: maxPx, u: -1 }

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const ax = trace[i * 2] ?? 0
    const ay = trace[i * 2 + 1] ?? 0
    const dx = (trace[j * 2] ?? 0) - ax
    const dy = (trace[j * 2 + 1] ?? 0) - ay
    const len = dx * dx + dy * dy
    const f = len === 0 ? 0 : Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / len))
    const d = Math.hypot(ax + dx * f - x, ay + dy * f - y)

    if (d <= best.d) best = { d, u: (i + f) / n }
  }

  return best.u < 0 ? null : best.u
}

export const nearestTurn = (trace: Float32Array, turns: ReadonlyArray<Turn>, x: number, y: number, maxPx: number) => {
  let best = { d: maxPx, u: -1 }

  for (const turn of turns) {
    const p = pointAt(trace, turn.u)
    const d = Math.hypot(p.x - x, p.y - y)

    if (d <= best.d) best = { d, u: turn.u }
  }

  return best.u < 0 ? null : best.u
}
