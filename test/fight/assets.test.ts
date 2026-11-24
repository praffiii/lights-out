import { expect, it } from 'bun:test'

import sharp from 'sharp'

import { pins } from '#/fight/pins.ts'

const KB = 1024

const VIEWS = ['switch', 'switch-phone', 'dive', 'dive-phone'] as const

const THEMES = ['light', 'dark'] as const

const file = (view: string, theme: string) => `public/defend/${view}-${theme}.webp`

it('ships the eight clay stills under 200 KB', async () => {
  for (const view of VIEWS)
    for (const theme of THEMES) {
      expect(`${view} ${theme} ${await Bun.file(file(view, theme)).exists()}`).toBe(`${view} ${theme} true`)
      expect(Bun.file(file(view, theme)).size).toBeLessThan(200 * KB)
    }
})

it('leaves the page showing around the hairpin', async () => {
  for (const view of ['switch', 'switch-phone'])
    for (const theme of THEMES) {
      const { data, info } = await sharp(file(view, theme)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

      expect(data[info.channels - 1]).toBe(0)
    }
})

it('pins sit inside the pictures they mark', () => {
  const marks = [
    ...['wide', 'dive', 'att', 'def'].map((k) => pins.switch[k]),
    ...['att', 'def'].map((k) => pins.switchPhone[k]),
    ...['mirror', 'axle'].flatMap((k) => [pins.dive[k], pins.divePhone[k]]),
  ]

  for (const p of marks) expect(p !== undefined && p.every((v) => v >= 0 && v <= 1)).toBe(true)
})
