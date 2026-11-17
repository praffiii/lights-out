import type { ModelledId } from '#/circuits/modelled.ts'
import type { Photo } from '#/home/content.ts'

export type Place = { label: string; turn: number; up?: true }

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

const REPSOL = 'Photo Box Repsol · CC BY 2.0'

export const TRACK_PAGES: Partial<Record<ModelledId, TrackPage>> = {
  vegas: {
    country: 'United States',
    intro: 'A street circuit through the casinos, raced on Saturday night.',
    hero: { src: '/img/tracks/vegas-hero.jpg', place: 'Esteban Ocon, Haas VF-25 · Las Vegas, 2025', credit: DHS, source: commons('Las_Vegas_Grand_Prix_(54942077056).jpg') },
    bandTitle: ['Down the Strip.', 'Past the Sphere.'],
    places: [
      { label: 'The Sphere · 112 m of LEDs', turn: 8, up: true },
      { label: 'The Strip · Las Vegas Boulevard', turn: 13 },
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
  losail: {
    country: 'Qatar',
    intro: 'Built for motorbikes in the desert north of Doha, raced at night under floodlights.',
    hero: { src: '/img/tracks/losail-hero.jpg', place: 'The MotoGP start · Lusail, 2012', credit: REPSOL, source: commons('2012_Qatar_Grand_Prix_start.jpg') },
    bandTitle: ['One long straight.', 'Then fast rights.'],
    places: [{ label: 'Fast rights · T12–14, no braking', turn: 13, up: true }],
    cornersBody: 'on a circuit built for MotoGP. Two corners worth knowing first.',
    corners: [
      {
        tag: 'T1 · End of the straight',
        line: 'The 1,068-metre straight ends in a right-hander, the first stop of the lap.',
        photo: { src: '/img/tracks/losail-t1.jpg', place: 'Marc Márquez leads the opening lap · Lusail, 2014', credit: REPSOL, source: commons('Marc_Márquez_leads_the_pack_2014_Losail.jpeg') },
      },
      {
        tag: 'T12–14 · The fast rights',
        line: 'Three fast right-handers, taken without braking. In 2023 their kerbs cut tyres.',
        photo: { src: '/img/tracks/losail-rights.jpg', place: 'Pol Espargaró, Repsol Honda · Lusail, 2021', credit: REPSOL, source: commons('Pol_Espargaró_2021_Doha_4.jpg') },
      },
    ],
    historyTitle: ['Built for bikes.', 'Then came F1.'],
    history: [
      { year: 2008, line: "MotoGP's first night race. The circuit opened in 2004, built for bikes." },
      { year: 2021, line: "F1's first visit, a late stand-in for Australia. Hamilton wins." },
      { year: 2023, line: 'Verstappen is champion on Saturday, in the sprint. On Sunday every set of tyres is limited to 18 laps.' },
    ],
    historyPhoto: { src: '/img/tracks/losail-2008.jpg', place: 'Casey Stoner, Ducati · Lusail, 2008', credit: 'Photo Cecep Gorbachev · CC BY 2.0', source: commons('CaseyStoner-01.jpg') },
  },
}
