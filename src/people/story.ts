import type { Place } from '#/weekend/CircuitStage.tsx'

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`

export const HERO = {
  given: 'Kimi',
  family: 'Antonelli',
  sub: '2026 world champion. Born in Bologna, 25 August 2006.',
  photo: {
    src: '/img/people/antonelli-story.jpg',
    place: 'Antonelli after his first win · Shanghai, 2026',
    credit: 'Photo Liauzh · CC BY 4.0',
    source: commons('2026_Chinese_GP_-_Mercedes_-_Kimi_Antonelli_-_Post_Race_Celebration.jpg'),
  },
} as const

export const NUMBERS = {
  label: 'In Formula 1',
  title: 'Second season, first title.',
  body: 'He arrived in 2025 at 18, the third-youngest driver in F1 history.',
  poles: 'The first at 19, the youngest ever',
  number: { value: '12', note: 'Kept for his title defence' },
  payoff: 'Five wins in a row from his first. Nobody had done that.',
} as const

export const RECORD = {
  label: 'The record',
  number: '20',
  unit: 'years and 68 days old',
  headline: 'Youngest champion ever.',
  body: "He clinched the title in Mexico City on 1 November 2026. The record he broke was Sebastian Vettel's, from 2010.",
  payoff: '3 years and 66 days younger.',
  ages: [
    { name: 'Antonelli', season: 2026, years: 20, days: 68 },
    { name: 'Vettel', season: 2010, years: 23, days: 134 },
    { name: 'Hamilton', season: 2008, years: 23, days: 300 },
    { name: 'Alonso', season: 2005, years: 24, days: 58 },
    { name: 'Verstappen', season: 2021, years: 24, days: 73 },
  ],
  credit: "Age on the day of each driver's first title",
} as const

const TAGS: ReadonlyArray<Place> = [
  { label: 'Pole', mark: 'pole' },
  { label: 'Grid 19 · his start', mark: 'grid-19', accent: true },
]

export const MONZA = {
  label: 'Monza · Round 13 · 6 September 2026',
  headline: ['Nineteenth', 'to first.'],
  body: 'A new power unit meant a grid penalty at his home race. He passed his teammate for the win: the first Italian to win at Monza in 60 years.',
  stats: [
    { label: 'Grid', value: '19th' },
    { label: 'Lap 10', value: '5th' },
    { label: 'Flag', value: '1st' },
  ],
  tags: TAGS,
  explain: 'Sectors: the lap in three timed parts. Turns: the eleven numbered turns. He started 19th, about 150 m behind the car on pole.',
  footnote:
    'Layout: bacinger/f1-circuits (MIT) · elevation: SRTM 30 m (NASA), exaggerated 1.5x · Map © OpenStreetMap contributors (ODbL) · turn numbers: F1 circuit map · sectors and grid: OpenF1, 2026 race',
} as const

export const W17 = {
  src: '/img/people/antonelli-w17.jpg',
  place: 'Kimi Antonelli, Mercedes W17 · Red Bull Ring, 2026',
  credit: 'Photo Lukas Raich · CC BY-SA 4.0',
  source: commons('FIA_F1_Austria_2026_Nr._12_Antonelli_(3).jpg'),
} as const

export const MILESTONES = {
  label: 'Milestones',
  title: ['From Bologna', 'to Mexico City.'],
  rows: [
    { year: 2006, line: 'Born in Bologna on 25 August. Karting at five.' },
    { year: 2020, line: 'European karting champion at 14, the youngest senior winner ever.' },
    { year: 2022, line: 'Wins the Italian and German F4 titles in his first full season.' },
    { year: 2023, line: 'Formula Regional champion, in Europe and the Middle East.' },
    { year: 2025, line: 'F1 debut in Melbourne at 18. Starts 16th, finishes 4th.' },
    { year: 2026, line: 'Youngest pole and first win in Shanghai. Champion in Mexico City.' },
  ],
} as const

export const NEXT_LEGENDS = {
  label: 'Next · Legends',
  title: 'Where the 12 came from.',
  line: 'Read',
  to: '/people#legends',
  photo: {
    src: '/img/people/senna-1989.jpg',
    place: 'Ayrton Senna · Belgian Grand Prix podium, Spa, 1989',
    credit: 'Photo madagascarica · CC BY 2.0',
    source: commons('Ayrton_Senna_1989_Belgian_GP_podium.jpg'),
  },
} as const

export const STORY_PHOTOS = [HERO.photo, W17, NEXT_LEGENDS.photo] as const
