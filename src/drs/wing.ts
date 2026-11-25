export const WING_FRAMES = 24

export const frameSrc = (i: number) => `/wing/${String(i).padStart(2, '0')}.webp`

export const nearestLoaded = (loaded: ReadonlySet<number>, want: number): number | null =>
  [...loaded].reduce<number | null>((best, i) => (best === null || Math.abs(i - want) < Math.abs(best - want) ? i : best), null)
