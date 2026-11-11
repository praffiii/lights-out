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
  tow: { term: 'Tow', def: 'Running close behind another car on a straight, inside the low-drag pocket of air it leaves.' },
  slipstream: { term: 'Slipstream', def: 'The pocket of slower air behind a car. Follow inside it and drag drops, so the car behind gains speed.' },
  dirtyAir: { term: 'Dirty air', def: 'The turbulent wake behind a car. In a corner it robs the car behind of grip, so it slides and its tyres overheat.' },
  detection: { term: 'Detection point', def: 'A line near the end of the lap. Cross it within a second of the car ahead and Overtake Mode unlocks.' },
  overtakeMode: { term: 'Overtake Mode', def: 'New in 2026. Extra electric energy for a car within a second of the one ahead, so it keeps full power for longer.' },
  straightMode: { term: 'Straight mode', def: 'On marked straights every car opens its front and rear wings to cut drag, then closes them for the corner.' },
  activeAero: { term: 'Active aero', def: 'Wings that move. From 2026 every car switches between a low-drag straight mode and a high-grip corner mode.' },
  brakingZone: { term: 'Braking zone', def: 'The stretch before a corner where drivers brake. Braking later than the car ahead is how most passes finish.' },
  insideLine: { term: 'Inside line', def: "The side of the track nearest the corner's apex. Whoever holds it into the corner usually keeps it." },
  drs: { term: 'DRS · until 2025', def: 'Drag Reduction System, 2011 to 2025. A flap in the rear wing that only the chasing car could open. Gone in 2026.' },
} as const

export type WordKey = keyof typeof WORDS

export const RACE_WEEKEND_WORDS: ReadonlyArray<WordKey> = ['practice', 'qualifying', 'knockout', 'pole', 'grid', 'formationLap', 'lightsOut', 'sprint', 'points', 'constructors', 'parcFerme']

export const OVERTAKING_WORDS: ReadonlyArray<WordKey> = ['tow', 'slipstream', 'dirtyAir', 'detection', 'overtakeMode', 'straightMode', 'activeAero', 'brakingZone', 'insideLine', 'drs']
