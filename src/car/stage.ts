export const END = 8

export const STOPS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export type Stage = { explode: number; lit: number | null; from: number | null; to: number; blend: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const smooth = (x: number) => {
  const f = clamp(x, 0, 1)

  return f * f * (3 - 2 * f)
}

export function stageAt(t: number): Stage {
  const seg = clamp(Math.ceil(t), 1, END)

  return {
    explode: clamp(t, 0, 1),
    lit: t < 0.5 ? null : clamp(Math.round(t) - 1, 0, END - 1),
    from: seg >= 2 ? seg - 2 : null,
    to: seg - 1,
    blend: clamp(t - (seg - 1), 0, 1),
  }
}

export const glowAt = (t: number, part: number) => smooth(1 - Math.abs(Math.min(t, END) - (part + 1)))

export const partLabel = (i: number) => `Part ${String(i + 1).padStart(2, '0')} of ${String(END).padStart(2, '0')}`
