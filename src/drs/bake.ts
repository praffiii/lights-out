import type { GhostRow } from './schema.ts'

export type Sample = { t: number; speed: number; drs: number }

const OPEN = 10

const KMH = 3.6

const isOpen = (s: Sample) => s.drs >= OPEN

export const openingAt = (samples: ReadonlyArray<Sample>): number | null => {
  const i = samples.findIndex(isOpen)
  const before = samples[i - 1]
  const first = samples[i]

  return before && first ? (before.t + first.t) / 2 : null
}

export const lastOpen = (samples: ReadonlyArray<Sample>): number | null => samples.filter(isOpen).at(-1)?.t ?? null

type Track = ReadonlyArray<{ t: number; m: number }>

const track = (samples: ReadonlyArray<Sample>): Track => {
  let m = 0

  return samples.map((s, i) => {
    const before = samples[i - 1]

    if (before) m += ((before.speed + s.speed) / 2 / KMH) * (s.t - before.t)

    return { t: s.t, m }
  })
}

const across = (at: Track, x: number, from: 't' | 'm', to: 't' | 'm') => {
  const i = Math.min(at.length - 1, Math.max(1, at.findIndex((p) => p[from] >= x)))
  const a = at[i - 1]
  const b = at[i]

  if (!a || !b) return 0

  return a[to] + ((b[to] - a[to]) * (x - a[from])) / (b[from] - a[from])
}

const slowest = (samples: ReadonlyArray<Sample>) => {
  const half = samples.slice(0, Math.ceil(samples.length / 2))

  return half.reduce((best, s) => (s.speed < best.speed ? s : best), half[0] ?? { t: 0, speed: 0, drs: 0 }).t
}

export const matchLine = (a: ReadonlyArray<Sample>, aLine: number, b: ReadonlyArray<Sample>): number => {
  const ta = track(a)
  const tb = track(b)
  const metres = across(ta, aLine, 't', 'm') - across(ta, slowest(a), 't', 'm')

  return across(tb, across(tb, slowest(b), 't', 'm') + metres, 'm', 't')
}

export const ghostRows = (samples: ReadonlyArray<Sample>, lineT: number, openU: number, lengthM: number): GhostRow[] => {
  const at = track(samples)
  const line = across(at, lineT, 't', 'm')

  return samples.map((s, i): GhostRow => [s.t - lineT, openU + ((at[i]?.m ?? 0) - line) / lengthM, s.speed])
}
