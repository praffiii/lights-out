import type { Crop } from './registry.ts'

export const FREE = [0.2, 0.41, 0.92, 0.785] as const

export type Fit = { k: number; x: number; y: number }

export const fitCrop = ([x0, y0, x1, y1]: Crop): Fit => {
  const [left, top, right, bottom] = FREE
  const k = Math.min(1, (right - left) / (x1 - x0), (bottom - top) / (y1 - y0))
  const centre = (lo: number, hi: number, a: number, b: number) => Math.min(Math.max((a + b) / 2, lo + (k * (b - a)) / 2), hi - (k * (b - a)) / 2)

  return { k, x: centre(left, right, x0, x1) - (k * (x0 + x1)) / 2, y: centre(top, bottom, y0, y1) - (k * (y0 + y1)) / 2 }
}

const SQUASH = Math.sin((36 * Math.PI) / 180)

const ROOM = 0.86

export type Spin = { w: number; h: number; x: number; y: number }

export const fitSpin = ([x0, y0, x1, y1]: Crop, aspect: number, rest = 16 / 10): Spin => {
  const cw = (x1 - x0) * rest
  const ch = y1 - y0
  const wide = Math.max(cw, (cw + ch / SQUASH) / Math.SQRT2)
  const tall = Math.max(ch, (SQUASH * cw + ch) / Math.SQRT2)
  const h = ROOM * Math.min(aspect / wide, 1 / tall)
  const w = (h * rest) / aspect

  return { w, h, x: ((x0 + x1) / 2) * w - 0.5, y: ((y0 + y1) / 2) * h - 0.5 }
}
