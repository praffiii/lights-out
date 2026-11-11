export const WORDS = {
  practice: { term: 'Practice', def: "An hour on track to try set-ups. Times hint, they don't count." },
  qualifying: { term: 'Qualifying', def: 'The knockout session that sets the starting order for the race.' },
  knockout: { term: 'Knockout', def: 'After each part of qualifying, the slowest six are out and their grid places are fixed.' },
  pole: { term: 'Pole position', def: 'First place on the grid, earned by the fastest lap in Q3.' },
  grid: { term: 'Grid', def: 'The starting order, painted as two columns of boxes on the straight.' },
  formationLap: { term: 'Formation lap', def: 'One slow lap to warm tyres and brakes, then every car stops in its grid box.' },
  lightsOut: { term: 'Lights out', def: 'Five red lights come on one by one. When they all go out, the race starts.' },
  sprint: { term: 'Sprint', def: 'A 100 km race on six weekends a year, with points for the top eight.' },
  points: { term: 'Points', def: 'Paid to the top ten: 25 for the win, down to 1 for tenth.' },
  constructors: { term: 'Constructors', def: "The teams. Both drivers' points add up to a second championship." },
  parcFerme: { term: 'Parc fermé', def: "French for 'closed park'. From qualifying on, the set-up is locked, so Saturday's car is Sunday's car." },
} as const

export type WordKey = keyof typeof WORDS

export const CHAPTER_WORDS: ReadonlyArray<WordKey> = ['practice', 'qualifying', 'knockout', 'pole', 'grid', 'formationLap', 'lightsOut', 'sprint', 'points', 'constructors', 'parcFerme']
