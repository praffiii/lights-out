import { Schema } from 'effect'

import baked from './gain.json'

export const GainFile = Schema.Array(Schema.Struct({ race: Schema.String, straight: Schema.String, pairs: Schema.Number, gain: Schema.Number }))

export type GainFile = typeof GainFile.Type

export const GAINS = Schema.decodeUnknownSync(GainFile)(baked)

export type Pass = { driver: number; lap: number; gap: number; open: number; top: number }

const OPEN_SAMPLES = 6

const INSIDE = [0.6, 1] as const

const OUTSIDE = [1, 1.45] as const

const APART = 3

const isInside = (p: Pass) => p.open >= OPEN_SAMPLES && p.gap >= INSIDE[0] && p.gap < INSIDE[1]

const isOutside = (p: Pass) => p.open === 0 && p.gap >= OUTSIDE[0] && p.gap <= OUTSIDE[1]

const near = (a: Pass, b: Pass) => a.driver === b.driver && a.lap !== b.lap && Math.abs(a.lap - b.lap) <= APART

export const pairs = (passes: ReadonlyArray<Pass>): ReadonlyArray<number> => {
  const outside = passes.filter(isOutside)

  return passes.filter(isInside).flatMap((a) => outside.flatMap((b) => (near(a, b) ? [a.top - b.top] : [])))
}

export const median = (xs: ReadonlyArray<number>) => {
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length === 0) return 0

  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}
