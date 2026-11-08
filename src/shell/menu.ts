import { CHAPTERS, type ChapterEntry, type Photo, PHOTOS } from '#/home/content.ts'

export type MenuEntry = { label: string; to: '/' | null; photo: Photo; subs?: ReadonlyArray<ChapterEntry> }

export const MENU: ReadonlyArray<MenuEntry> = [
  { label: 'Home', to: '/', photo: PHOTOS.heroLight },
  { label: 'How F1 works', to: null, photo: PHOTOS.ch01, subs: CHAPTERS },
  { label: 'This season', to: null, photo: PHOTOS.heroDark },
  { label: 'The car', to: null, photo: PHOTOS.williams },
  { label: 'The engine', to: null, photo: PHOTOS.brm },
  { label: 'The tracks', to: null, photo: PHOTOS.ch02 },
  { label: 'The people', to: null, photo: PHOTOS.ch05 },
  { label: 'Glossary', to: null, photo: PHOTOS.ch04 },
]

export const FOOTER_LINKS = ['Credits', 'Source', 'Replay the intro'] as const
