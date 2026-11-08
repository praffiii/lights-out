/** Spike content: the Home mock's copy and the Commons credits, in one place. */

export type Photo = { src: string; place: string; credit: string }

export const PHOTOS = {
  heroLight: { src: '/img/hero-light.jpg', place: 'Lewis Hamilton · Ferrari SF-25 · Suzuka, 2025', credit: 'Photo Liauzh · CC BY-SA 4.0' },
  heroDark: { src: '/img/hero-dark.jpg', place: 'McLaren MCL39 · Las Vegas, 2025', credit: 'Photo DHSgov · Public domain' },
  ch01: { src: '/img/ch01.jpg', place: 'The grid · Shanghai, 2024', credit: 'Photo Liauzh · CC BY-SA 4.0' },
  ch02: { src: '/img/ch02.jpg', place: 'Main straight · Baku, 2026', credit: 'Photo Press Service of the President of Azerbaijan · CC BY 4.0' },
  ch03: { src: '/img/ch03.jpg', place: 'Pit lane · Suzuka, 2024', credit: 'Photo Cineyas · CC BY-SA 4.0' },
  ch04: { src: '/img/ch04.jpg', place: 'Safety car board · Zandvoort, 2024', credit: 'Photo Steffen Prößdorf · CC BY-SA 4.0' },
  ch05: { src: '/img/ch05.jpg', place: 'Oscar Piastri · McLaren MCL40 · Suzuka, 2026', credit: 'Photo Martin Lee · CC BY-SA 4.0' },
} satisfies Record<string, Photo>

export const CHAPTERS = [
  { n: '01', title: 'A race weekend, Friday to Sunday', min: 6, photo: PHOTOS.ch01, to: null },
  { n: '02', title: 'How overtaking works', min: 5, photo: PHOTOS.ch02, to: '/chapters/overtaking' },
  { n: '03', title: 'Tyres and strategy', min: 7, photo: PHOTOS.ch03, to: null },
  { n: '04', title: 'Flags and what they mean', min: 4, photo: PHOTOS.ch04, to: null },
  { n: '05', title: 'Inside the car', min: 8, photo: PHOTOS.ch05, to: null },
] as const

/** The menu: every link has a photo, so hovering never leaves a void. Only Home and Chapter 02 exist in the spike. */
export const MENU = [
  { label: 'Home', to: '/', photo: PHOTOS.heroLight },
  { label: 'How F1 works', to: null, photo: PHOTOS.ch01, subs: CHAPTERS },
  { label: 'This season', to: null, photo: PHOTOS.heroDark },
  { label: 'The tracks', to: null, photo: PHOTOS.ch02 },
  { label: 'The people', to: null, photo: PHOTOS.ch05 },
  { label: 'Glossary', to: null, photo: PHOTOS.ch04 },
] as const

/** Callouts on the Williams photo, in the mock's pixels on a 1440 × 548 frame: chip's top left, then the dot. */
export const CALLOUTS = [
  { label: 'Halo', chip: [562, 25], dot: [605, 133] },
  { label: 'Power unit', chip: [902, 25], dot: [968, 158] },
  { label: 'Rear wing · active aero', chip: [1152, 25], dot: [1305, 135] },
  { label: 'Front wing', chip: [74, 421], dot: [124, 313] },
  { label: 'Tyre', chip: [362, 421], dot: [388, 225] },
  { label: 'Sidepod', chip: [742, 421], dot: [788, 276] },
] as const
export const CHIP_H = 25

/** count: how the number counts up (see countUp); null for a value that stays still. */
export const CAR_STATS = [
  { k: 'Power unit', v: '1.6 L V6 turbo hybrid', count: null },
  { k: 'Minimum weight', v: '768 kg', count: '' },
  { k: 'Wheelbase', v: '3,400 mm max', count: 'group' },
  { k: 'Aerodynamics', v: 'Active, two modes', count: null },
] as const

/** Spike data: the weekend box counts down from this offset at load. The real one reads the live schedule. */
export const NEXT_SESSION_IN_S = 2 * 3600 + 14 * 60 + 7
