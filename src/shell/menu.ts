import { CHAPTERS, type ChapterEntry, type Photo, PHOTOS } from '#/home/content.ts'

import type { To } from './context.ts'

export type MenuEntry = { label: string; to: To | null; href?: string; photo: Photo; chapters?: ReadonlyArray<ChapterEntry>; weekend?: true }

export const MENU: ReadonlyArray<MenuEntry> = [
  { label: 'Home', to: '/', photo: PHOTOS.heroLight },
  { label: 'How F1 works', to: null, href: '/#start', photo: PHOTOS.ch01, chapters: CHAPTERS },
  { label: 'This season', to: '/season', photo: PHOTOS.heroDark, weekend: true },
  { label: 'The car', to: '/chapters/inside-the-car', photo: PHOTOS.williams },
  { label: 'The engine', to: null, photo: PHOTOS.brm },
  { label: 'The tracks', to: null, photo: PHOTOS.ch02 },
  { label: 'The people', to: null, photo: PHOTOS.ch05 },
  { label: 'Glossary', to: '/glossary', photo: PHOTOS.ch04 },
]

export const FOOTER_LINKS: ReadonlyArray<{ label: string; to?: To; href?: string }> = [{ label: 'Credits', to: '/credits' }, { label: 'Source', href: 'https://github.com/praffiii/lights-out' }]
