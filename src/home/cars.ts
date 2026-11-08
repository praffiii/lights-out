export type Car = { code: string; driver: string; team: string; car: string; colour: string; src: string; credit: string; commons: string }

const TEAMS = {
  McLaren: { car: 'MCL40', colour: '#FF8000' },
  Mercedes: { car: 'W17', colour: '#27F4D2' },
  'Red Bull': { car: 'RB22', colour: '#3671C6' },
  Ferrari: { car: 'SF-26', colour: '#E8002D' },
  Williams: { car: 'FW48', colour: '#64C4FF' },
  'Racing Bulls': { car: 'VCARB 03', colour: '#6692FF' },
  'Aston Martin': { car: 'AMR26', colour: '#229971' },
  Haas: { car: 'VF-26', colour: '#B6BABD' },
  Audi: { car: 'R26', colour: '#F50537' },
  Alpine: { car: 'A526', colour: '#0093CC' },
  Cadillac: { car: 'MAC-26', colour: '#C9A227' },
} as const

const DRIVERS = [
  ['PIA', 'Oscar Piastri', 'McLaren'],
  ['NOR', 'Lando Norris', 'McLaren'],
  ['RUS', 'George Russell', 'Mercedes'],
  ['ANT', 'Kimi Antonelli', 'Mercedes'],
  ['VER', 'Max Verstappen', 'Red Bull'],
  ['HAD', 'Isack Hadjar', 'Red Bull'],
  ['LEC', 'Charles Leclerc', 'Ferrari'],
  ['HAM', 'Lewis Hamilton', 'Ferrari'],
  ['ALB', 'Alex Albon', 'Williams'],
  ['SAI', 'Carlos Sainz', 'Williams'],
  ['LAW', 'Liam Lawson', 'Racing Bulls'],
  ['LIN', 'Arvid Lindblad', 'Racing Bulls'],
  ['ALO', 'Fernando Alonso', 'Aston Martin'],
  ['STR', 'Lance Stroll', 'Aston Martin'],
  ['OCO', 'Esteban Ocon', 'Haas'],
  ['BEA', 'Oliver Bearman', 'Haas'],
  ['HUL', 'Nico Hülkenberg', 'Audi'],
  ['BOR', 'Gabriel Bortoleto', 'Audi'],
  ['GAS', 'Pierre Gasly', 'Alpine'],
  ['COL', 'Franco Colapinto', 'Alpine'],
  ['PER', 'Sergio Pérez', 'Cadillac'],
  ['BOT', 'Valtteri Bottas', 'Cadillac'],
] as const

const SESSION = new Map([
  ['HAD', 'Sprint_Qualifying'],
  ['SAI', 'FP1'],
  ['STR', 'FP1'],
  ['PER', 'FP1'],
])

const slug = (name: string) => name.normalize('NFD').replace(/\p{M}/gu, '').replaceAll(' ', '_')

export const CARS: ReadonlyArray<Car> = DRIVERS.map(([code, driver, team]) => ({
  code,
  driver,
  team,
  ...TEAMS[team],
  src: `/img/cars/${code.toLowerCase()}.webp`,
  credit: 'Liauzh · CC BY 4.0',
  commons: `https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_${slug(team)}_-_${slug(driver)}_-_${SESSION.get(code) ?? 'Qualifying'}.jpg`,
}))
