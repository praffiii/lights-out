import type { To } from '#/shell/context.ts'

export type Photo = { src: string; place: string; credit: string }

export const PHOTOS = {
  heroLight: { src: '/img/hero-light.jpg', place: 'Lewis Hamilton · Ferrari SF-25 · Suzuka, 2025', credit: 'Photo Liauzh · CC BY-SA 4.0' },
  heroDark: { src: '/img/hero-dark.jpg', place: 'McLaren MCL39 · Las Vegas, 2025', credit: 'Photo DHSgov · Public domain' },
  ch01: { src: '/img/ch01.jpg', place: 'The grid · Shanghai, 2024', credit: 'Photo Liauzh · CC BY-SA 4.0' },
  ch02: { src: '/img/ch02.jpg', place: 'Main straight · Baku, 2026', credit: 'Photo Press Service of the President of Azerbaijan · CC BY 4.0' },
  ch03: { src: '/img/ch03.jpg', place: 'Pit lane · Suzuka, 2024', credit: 'Photo Cineyas · CC BY-SA 4.0' },
  ch04: { src: '/img/ch04.jpg', place: 'Safety car board · Zandvoort, 2024', credit: 'Photo Steffen Prößdorf · CC BY-SA 4.0' },
  ch05: { src: '/img/ch05.jpg', place: 'Oscar Piastri · McLaren MCL40 · Suzuka, 2026', credit: 'Photo Martin Lee · CC BY-SA 4.0' },
  tyres: { src: '/img/tyres.jpg', place: 'Pirelli tyres, slicks to wets', credit: 'Photo Hullian111 · CC BY-SA 4.0' },
  williams: { src: '/img/williams.jpg', place: 'Williams FW48 · Shanghai, 2026', credit: 'Photo Liauzh · CC BY 4.0' },
  brm: { src: '/img/y1973.jpg', place: 'BRM mechanics · Anderstorp, 1973', credit: 'Photo Markku Lepola · CC BY 4.0' },
  startLights: { src: '/img/start-lights.jpg', place: 'Start lights · Melbourne, 2026 · cropped', credit: 'Photo Yu Chu Chin · CC BY-SA 4.0' },
} satisfies Record<string, Photo>

export type ChapterPath = Extract<To, `/chapters/${string}`>

export type ChapterEntry = { n: string; title: string; min: number; photo: Photo; to: ChapterPath | null }

export const CHAPTERS: ReadonlyArray<ChapterEntry> = [
  { n: '01', title: 'A race weekend, Friday to Sunday', min: 6, photo: PHOTOS.ch01, to: null },
  { n: '02', title: 'How overtaking works', min: 5, photo: PHOTOS.ch02, to: null },
  { n: '03', title: 'Tyres and strategy', min: 7, photo: PHOTOS.ch03, to: null },
  { n: '04', title: 'Flags and what they mean', min: 4, photo: PHOTOS.ch04, to: null },
  { n: '05', title: 'Inside the car', min: 8, photo: PHOTOS.ch05, to: null },
]

export const HERO = {
  lines: ['Formula 1,', 'from lights out.'],
  intro: 'A fan-made guide for anyone who just watched their first race and wants to know what happened.',
  meta: '2026 season · 22 drivers · 11 teams · 23 races',
}

export const CALLOUT_FRAME = { w: 1440, h: 548 }

export const CALLOUTS = [
  { label: 'Halo', chip: [562, 25], dot: [605, 133] },
  { label: 'Power unit', chip: [902, 25], dot: [968, 158] },
  { label: 'Rear wing · active aero', chip: [1152, 25], dot: [1305, 135] },
  { label: 'Front wing', chip: [74, 421], dot: [124, 313] },
  { label: 'Tyre', chip: [362, 421], dot: [388, 225] },
  { label: 'Sidepod', chip: [742, 421], dot: [788, 276] },
] as const

export const CHIP_H = 25

export const CAR_STATS = [
  { k: 'Power unit', v: '1.6 L V6 turbo hybrid', count: null },
  { k: 'Minimum weight', v: '768 kg', count: '' },
  { k: 'Wheelbase', v: '3,400 mm max', count: 'group' },
  { k: 'Aerodynamics', v: 'Active, two modes', count: null },
] as const

export const READ_NEXT = [
  { title: 'Why one pit stop can win a race.', kind: 'Strategy', photo: PHOTOS.tyres, alt: 'Pirelli tyres on display, from slicks to wets.' },
  { title: 'Swedish Grand Prix, 1973.', kind: 'History', photo: PHOTOS.brm, alt: 'Mechanics at work on the number 20 BRM at the 1973 Swedish Grand Prix.' },
] as const
