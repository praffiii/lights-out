import { portraitFor } from '#/drivers/portraits.ts'

const antonelli = portraitFor('ANT')

if (!antonelli) throw new Error('the Antonelli portrait is missing')

export const BAND = {
  season: 2026,
  label: '2026 champion',
  title: ['Champion', 'at twenty.'],
  body: "Kimi Antonelli clinched the title in Mexico City with four rounds to spare. The record had been Sebastian Vettel's since 2010, set at 23.",
  stat: { label: 'Age on the day', value: '20', unit: 'years, 68 days' },
  payoff: 'The youngest champion in F1 history.',
  read: 'Read  →',
  to: '/people/antonelli',
  photo: { ...antonelli, place: 'Melbourne Walk · 2026' },
  caption: 'Kimi Antonelli, signing for fans',
} as const

export const LEGENDS = {
  label: 'Legends',
  meta: 'World titles · four or more',
  title: ['The ones', 'they chase.'],
  rows: [
    { titles: 7, line: 'Michael Schumacher. Two with Benetton, then five in a row with Ferrari from 2000.' },
    { titles: 7, line: 'Lewis Hamilton. One with McLaren in 2008, six with Mercedes. Still racing, now with Ferrari.' },
    { titles: 5, line: 'Juan Manuel Fangio. Five in the 1950s, with four different teams.' },
    { titles: 4, line: 'Alain Prost. 1985, 1986, 1989 and 1993.' },
    { titles: 4, line: 'Sebastian Vettel. Four in a row with Red Bull, 2010 to 2013.' },
    { titles: 4, line: 'Max Verstappen. Four in a row with Red Bull, 2021 to 2024. Still racing.' },
  ],
  note: 'Three titles, and the number 12 that Antonelli races in his honour.',
} as const

export const NEXT_SEASON = {
  label: 'Next · This season',
  title: 'The fight for second.',
  line: 'Read',
  to: '/season',
} as const
