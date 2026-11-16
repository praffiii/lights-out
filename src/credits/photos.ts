import { CALENDAR } from '#/circuits/calendar.ts'
import { PORTRAITS } from '#/drivers/portraits.ts'
import { CARS } from '#/home/cars.ts'
import { PHOTOS } from '#/home/content.ts'

export type Credit = { src: string; place: string; by: string; licence: string; source: string | null; usedOn: string }

const USED_ON = {
  heroLight: 'Menu',
  heroDark: 'Chapter 05, Menu',
  ch01: 'Home, Chapter 01, Menu',
  ch02: 'Home, Chapters 01 and 02, Race weekend, Glossary',
  ch02Straight: 'Chapter 02',
  ch02Turn1: 'Chapter 02',
  ch02Exit: 'Chapter 02',
  ch02Tow: 'Chapter 02',
  ch03: 'Home, Chapters 02 and 03',
  ch03Medium: 'Chapter 03',
  ch03Sc: 'Chapter 03',
  ch04: 'Home, Chapters 03 and 04, Menu',
  ch04Marshal: 'Chapter 04',
  ch04Sweep: 'Chapter 04',
  ch04Fire: 'Chapter 04',
  ch04Board: 'Chapter 04',
  ch05: 'Home, Chapters 04 and 05, Menu',
  ch05History1950: 'Chapter 05',
  ch05History1978: 'Chapter 05',
  ch05History2026: 'Chapter 05',
  tyres: 'Home',
  williams: 'Home, Menu',
  brm: 'Home, Menu',
  startLights: 'Footer',
} satisfies Record<keyof typeof PHOTOS, string>

const used = new Map(Object.entries(USED_ON))

export const creditParts = (credit: string): { by: string; licence: string } | null => {
  const parts = credit.split(' · ')
  const licence = parts.at(-1)
  const by = parts.at(-2)

  return licence && by ? { by: by.replace(/^Photo /, ''), licence } : null
}

const entry = (photo: { src: string; place: string; credit: string; source?: string }, usedOn: string): Credit => {
  const parts = creditParts(photo.credit)

  if (!parts) throw new Error(`Unreadable photo credit: ${photo.credit}`)

  return { src: photo.src, place: photo.place, ...parts, source: photo.source ?? null, usedOn }
}

const every: ReadonlyArray<Credit> = [
  ...Object.entries(PHOTOS).map(([key, photo]) => entry(photo, used.get(key) ?? '')),
  ...Object.values(CALENDAR).map(({ photo }) => entry({ ...photo, src: photo.small }, 'This season, Race weekend')),
  ...Object.values(PORTRAITS).flatMap((photo) => (photo ? [entry(photo, 'This season, Race weekend')] : [])),
  ...CARS.map((car) => entry({ src: car.src, place: `${car.team} ${car.car} · Shanghai, 2026`, credit: car.credit, source: car.commons }, 'Home')),
]

const merged = new Map<string, Credit>()

for (const credit of every) {
  const key = credit.source ?? credit.src
  const first = merged.get(key)

  merged.set(key, first ? { ...first, usedOn: [...new Set([...first.usedOn.split(', '), ...credit.usedOn.split(', ')])].join(', ') } : credit)
}

export const CREDITS: ReadonlyArray<Credit> = [...merged.values()]

export const COUNTS = { photos: CREDITS.length, photographers: new Set(CREDITS.map((c) => c.by)).size }
