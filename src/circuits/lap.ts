import type { LinePoint } from './registry.ts'

const TOP_SPEED = 92
const GRIP = 44
const ACCEL = 11
const BRAKE = 38
const CURVATURE_WINDOW = 6

const flat = (a: LinePoint, b: LinePoint) => Math.hypot(b.x - a.x, b.z - a.z)

export const lapProfile = (line: ReadonlyArray<LinePoint>, metresPerUnit: number) => {
  const n = line.length
  const wrap = (i: number) => ((i % n) + n) % n
  const at = (i: number) => line[wrap(i)] ?? line[0]
  const dist = line.map((p, i) => flat(p, at(i + 1)) * metresPerUnit)

  const speedSq = line.map((p, i) => {
    const a = at(i - CURVATURE_WINDOW)
    const b = at(i + CURVATURE_WINDOW)
    const cross = Math.abs((p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x))
    const sides = flat(a, p) * flat(p, b) * flat(a, b)
    const curvature = sides === 0 ? 0 : (2 * cross) / (sides * metresPerUnit)

    return curvature === 0 ? TOP_SPEED ** 2 : Math.min(TOP_SPEED ** 2, GRIP / curvature)
  })

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const next = wrap(i + 1)

      speedSq[next] = Math.min(speedSq[next] ?? 0, (speedSq[i] ?? 0) + 2 * ACCEL * (dist[i] ?? 0))
    }

    for (let i = n - 1; i >= 0; i--) {
      speedSq[i] = Math.min(speedSq[i] ?? 0, (speedSq[wrap(i + 1)] ?? 0) + 2 * BRAKE * (dist[i] ?? 0))
    }
  }

  const cumulative = [0]

  for (let i = 0; i < n; i++) {
    const mean = (Math.sqrt(speedSq[i] ?? 0) + Math.sqrt(speedSq[wrap(i + 1)] ?? 0)) / 2

    cumulative.push((cumulative[i] ?? 0) + (dist[i] ?? 0) / mean)
  }

  const seconds = cumulative[n] ?? 0

  const uAt = (t: number) => {
    const target = (t - Math.floor(t)) * seconds
    let lo = 0
    let hi = n - 1

    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1

      if ((cumulative[mid] ?? 0) <= target) lo = mid
      else hi = mid - 1
    }

    const start = cumulative[lo] ?? 0
    const span = (cumulative[lo + 1] ?? start) - start
    const fraction = span === 0 ? 0 : (target - start) / span
    const u1 = lo + 1 < n ? at(lo + 1).u : 1

    return at(lo).u + (u1 - at(lo).u) * fraction
  }

  return { seconds, uAt }
}
