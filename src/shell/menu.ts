import { CHAPTERS, type Photo, PHOTOS } from '#/home/content.ts'

import type { To } from './context.ts'

export type MenuSub = { key: string; label: string; to: To | null }

export type MenuEntry = { label: string; to: To | null; photo: Photo; subs?: ReadonlyArray<MenuSub> }

export const MENU: ReadonlyArray<MenuEntry> = [
  { label: 'Home', to: '/', photo: PHOTOS.heroLight },
  { label: 'How F1 works', to: null, photo: PHOTOS.ch01, subs: CHAPTERS.map((c) => ({ key: c.n, label: `${c.n} ${c.title}`, to: c.to })) },
  { label: 'This season', to: '/season', photo: PHOTOS.heroDark, subs: [{ key: 'weekend', label: 'Race weekend', to: '/weekend' }] },
  { label: 'The car', to: null, photo: PHOTOS.williams },
  { label: 'The engine', to: null, photo: PHOTOS.brm },
  { label: 'The tracks', to: null, photo: PHOTOS.ch02 },
  { label: 'The people', to: null, photo: PHOTOS.ch05 },
  { label: 'Glossary', to: null, photo: PHOTOS.ch04 },
]

export const FOOTER_LINKS = ['Credits', 'Source'] as const
