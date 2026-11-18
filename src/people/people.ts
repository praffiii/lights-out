import type { Photo } from '#/home/content.ts'

export type Person = { driverId: string; code: string; hero?: Photo }

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`

const HEROES = new Map<string, Photo>([
  [
    'ocon',
    {
      src: '/img/people/ocon-hero.jpg',
      place: 'Esteban Ocon, Haas VF-26 · Shanghai, 2026',
      credit: 'Photo Liauzh · CC BY 4.0',
      source: commons('2026_Chinese_GP_-_Haas_-_Esteban_Ocon_-_Qualifying.jpg'),
    },
  ],
])

const IDS = [
  ['antonelli', 'ANT'],
  ['max_verstappen', 'VER'],
  ['russell', 'RUS'],
  ['hamilton', 'HAM'],
  ['leclerc', 'LEC'],
  ['norris', 'NOR'],
  ['piastri', 'PIA'],
  ['hadjar', 'HAD'],
  ['lawson', 'LAW'],
  ['gasly', 'GAS'],
  ['arvid_lindblad', 'LIN'],
  ['colapinto', 'COL'],
  ['bearman', 'BEA'],
  ['bortoleto', 'BOR'],
  ['hulkenberg', 'HUL'],
  ['ocon', 'OCO'],
  ['alonso', 'ALO'],
  ['sainz', 'SAI'],
  ['albon', 'ALB'],
  ['stroll', 'STR'],
  ['bottas', 'BOT'],
  ['perez', 'PER'],
] as const

export const PEOPLE: ReadonlyArray<Person> = IDS.map(([driverId, code]) => {
  const hero = HEROES.get(driverId)

  return hero ? { driverId, code, hero } : { driverId, code }
})

export const personFor = (driverId: string) => PEOPLE.find((person) => person.driverId === driverId)
