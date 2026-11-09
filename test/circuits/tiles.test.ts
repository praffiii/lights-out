import { expect, it } from 'bun:test'

import { CALENDAR, tileSrc } from '../../src/circuits/calendar.ts'

const STATES = ['done', 'upcoming', 'now', 'hover'] as const

const THEMES = ['light', 'dark'] as const

it('every calendar tile is rendered', async () => {
  const srcs = Object.values(CALENDAR).flatMap(({ tile }) => STATES.flatMap((state) => THEMES.map((theme) => tileSrc(tile, state, theme))))
  const sizes = await Promise.all(srcs.map(async (src) => [src, await Bun.file(`public${src}`).exists() ? Bun.file(`public${src}`).size : 0] as const))
  const bad = sizes.filter(([, size]) => size < 1 || size > 40_000).map(([src]) => src)

  expect(srcs).toHaveLength(184)
  expect(bad).toEqual([])
})
