import type { ModelledId } from '#/circuits/modelled.ts'
import type { Photo } from '#/home/content.ts'

export type Place = { label: string; at: { turn: number } | { between: readonly [number, number] }; up?: true }

export type Corner = { tag: string; line: string; photo: Photo }

export type HistoryRow = { year: number; line: string }

export type TrackPage = {
  country: string
  intro: string
  hero: Photo
  bandTitle: readonly [string, string]
  places: ReadonlyArray<Place>
  cornersBody: string
  corners: readonly [Corner, Corner]
  historyTitle: readonly [string, string]
  history: ReadonlyArray<HistoryRow>
  historyPhoto: Photo
}

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`

const DHS = 'Photo DHSgov · Public domain'

export const TRACK_PAGES: Partial<Record<ModelledId, TrackPage>> = {
  vegas: {
    country: 'United States',
    intro: 'A street circuit through the casinos, raced on Saturday night.',
    hero: { src: '/img/tracks/vegas-hero.jpg', place: 'Esteban Ocon, Haas VF-25 · Las Vegas, 2025', credit: DHS, source: commons('Las_Vegas_Grand_Prix_(54942077056).jpg') },
    bandTitle: ['Down the Strip.', 'Past the Sphere.'],
    places: [
      { label: 'The Sphere · 112 m of LEDs', at: { turn: 8 }, up: true },
      { label: 'The Strip · Las Vegas Boulevard', at: { between: [12, 14] } },
    ],
    cornersBody: 'on public roads closed for the sessions. Two corners worth knowing first.',
    corners: [
      {
        tag: 'T7–9 · The Sphere',
        line: 'Three slow corners that wrap around the Sphere, the 112-metre LED globe beside the track.',
        photo: { src: '/img/tracks/vegas-sphere.jpg', place: 'Charles Leclerc, Ferrari SF-25 · Las Vegas, 2025', credit: DHS, source: commons('Las_Vegas_Grand_Prix_(54942077481).jpg') },
      },
      {
        tag: 'T12 · Onto the Strip',
        line: 'A left onto Las Vegas Boulevard, then the longest run of the lap without braking.',
        photo: { src: '/img/tracks/vegas-strip.jpg', place: 'Red Bull RB21 · Las Vegas, 2025', credit: DHS, source: commons('Las_Vegas_Grand_Prix_(54941205212).jpg') },
      },
    ],
    historyTitle: ['Three titles', 'settled here.'],
    history: [
      { year: 1981, line: 'The first race, in the Caesars Palace car park. Piquet finishes fifth and is champion by one point.' },
      { year: 1982, line: 'Alboreto wins. Rosberg is champion, with one win all season.' },
      { year: 2024, line: 'Russell wins on the Strip. Verstappen takes his fourth title.' },
    ],
    historyPhoto: { src: '/img/tracks/vegas-1982.jpg', place: 'Derek Warwick, Toleman · Caesars Palace, 1982', credit: 'Video still, author unknown · Public domain', source: commons('Derek_Warwick_Las_Vegas_1982.jpg') },
  },
}
