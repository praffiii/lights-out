import type { PoleRow } from '#/pole/schema.ts'

type Rows = ReadonlyArray<PoleRow>

export const CAR_M = 5.5

const mix = (a: number, b: number, f: number) => a + (b - a) * f

export const crossTime = (rows: Rows, u: number): number | null => {
  for (const [i, b] of rows.entries()) {
    if (b[1] < u) continue

    const a = rows[i - 1]

    if (!a) return b[1] === u ? b[0] : null

    return b[1] === a[1] ? a[0] : mix(a[0], b[0], (u - a[1]) / (b[1] - a[1]))
  }

  return null
}

export const brakeOnset = (rows: Rows, from: number, to: number): { t: number; u: number } | null => {
  for (const [i, b] of rows.entries()) {
    if (b[1] < from || b[1] > to || b[5] <= 0) continue

    const a = rows[i - 1]

    return a && a[5] <= 0 && a[1] >= from ? { t: mix(a[0], b[0], 0.5), u: mix(a[1], b[1], 0.5) } : { t: b[0], u: b[1] }
  }

  return null
}
