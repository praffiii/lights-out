export const THEMES = {
  light: { bg: '#F4F3EF', ink: '#111214', muted: '#6E7178', line: '#DCDAD4', unfilled: '#CAC8C1' },
  dark: { bg: '#0E0F11', ink: '#F2F1EC', muted: '#8A8D93', line: '#26282D', unfilled: '#3A3C42' },
} as const
export type Theme = keyof typeof THEMES
export const opposite = (t: Theme): Theme => (t === 'light' ? 'dark' : 'light')

/** Sector colour and the lap fraction where it starts. Cuts must match SECTOR_CUTS in blender/circuit.py. */
export const SECTORS = {
  S1: { color: '#A43BFF', from: 0 },
  S2: { color: '#2BD45E', from: 0.27 },
  S3: { color: '#F5C400', from: 0.66 },
} as const
export type Sector = keyof typeof SECTORS
export const isSector = (name: string): name is Sector => name in SECTORS


/** The matte shading rule. Must match SIDE, RELIEF and LIGHT in blender/circuit.py. */
export const SIDE = 0.62
export const RELIEF = 0.35
export const LIGHT = [-0.6, 0.8] as const
