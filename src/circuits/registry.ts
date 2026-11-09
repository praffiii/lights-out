import { CALENDAR, type CalendarCircuit } from './calendar.ts'
import ae2009Line from './lines/ae-2009.json'
import ae2009 from './pins/ae-2009.json'
import au1953Line from './lines/au-1953.json'
import au1953 from './pins/au-1953.json'
import br1940Line from './lines/br-1940.json'
import br1940 from './pins/br-1940.json'
import qa2004Line from './lines/qa-2004.json'
import qa2004 from './pins/qa-2004.json'
import us2023Line from './lines/us-2023.json'
import us2023 from './pins/us-2023.json'

export type LinePoint = { u: number; x: number; y: number; z: number }

export type Crop = readonly [x0: number, y0: number, x1: number, y1: number]

export type Pin = { turn: number; x: number; y: number }

export type CircuitFacts = {
  firstGp: number
  lengthKm: string
  laps: number
  distanceKm: string
  turns: number
  direction: 'clockwise' | 'anticlockwise'
}

export type CircuitInfo = {
  model: string
  name: string
  gp: string
  tz: string
  corner?: { turn: number; name: string }
  facts: CircuitFacts
  pins: ReadonlyArray<Pin>
  line: ReadonlyArray<LinePoint>
  crop: Crop
  cuts: readonly [number, number]
  relief: 3 | 6
}

const pinsOf = (json: Record<string, ReadonlyArray<number> | null>): ReadonlyArray<Pin> =>
  Object.entries(json)
    .flatMap(([name, at]) => {
      const turn = Number(name.replace('turn-', ''))
      const [x, y] = at ?? []

      return name.startsWith('turn-') && x !== undefined && y !== undefined ? [{ turn, x, y }] : []
    })
    .sort((a, b) => a.turn - b.turn)

const cropOf = ({ crop: [x0, y0, x1, y1] }: { crop: ReadonlyArray<number> }): Crop => {
  if (x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined) throw new Error('pins json has no crop')

  return [x0, y0, x1, y1]
}

const fromCalendar = ({ tile, name, gp, tz }: CalendarCircuit) => ({ model: tile, name, gp, tz })

const factsOf = ({ firstGp, lengthKm, laps }: CalendarCircuit, rest: Omit<CircuitFacts, 'firstGp' | 'lengthKm' | 'laps'>): CircuitFacts => ({ firstGp, lengthKm, laps, ...rest })

const CIRCUITS = {
  interlagos: {
    ...fromCalendar(CALENDAR.interlagos),
    corner: { turn: 1, name: 'S do Senna' },
    facts: factsOf(CALENDAR.interlagos, { distanceKm: '305.879', turns: 15, direction: 'anticlockwise' }),
    pins: pinsOf(br1940),
    line: br1940Line,
    crop: cropOf(br1940),
    cuts: [0.282, 0.73],
    relief: 3,
  },
  vegas: {
    ...fromCalendar(CALENDAR.vegas),
    corner: { turn: 7, name: 'Sphere chicane' },
    facts: factsOf(CALENDAR.vegas, { distanceKm: '309.958', turns: 17, direction: 'anticlockwise' }),
    pins: pinsOf(us2023),
    line: us2023Line,
    crop: cropOf(us2023),
    cuts: [0.243, 0.518],
    relief: 3,
  },
  losail: {
    ...fromCalendar(CALENDAR.losail),
    facts: factsOf(CALENDAR.losail, { distanceKm: '308.611', turns: 16, direction: 'clockwise' }),
    pins: pinsOf(qa2004),
    line: qa2004Line,
    crop: cropOf(qa2004),
    cuts: [0.343, 0.635],
    relief: 6,
  },
  yas_marina: {
    ...fromCalendar(CALENDAR.yas_marina),
    facts: factsOf(CALENDAR.yas_marina, { distanceKm: '306.188', turns: 16, direction: 'anticlockwise' }),
    pins: pinsOf(ae2009),
    line: ae2009Line,
    crop: cropOf(ae2009),
    cuts: [0.211, 0.657],
    relief: 6,
  },
  albert_park: {
    ...fromCalendar(CALENDAR.albert_park),
    facts: factsOf(CALENDAR.albert_park, { distanceKm: '306.124', turns: 14, direction: 'clockwise' }),
    pins: pinsOf(au1953),
    line: au1953Line,
    crop: cropOf(au1953),
    cuts: [0.328, 0.6],
    relief: 6,
  },
} satisfies Record<string, CircuitInfo>

const byId = new Map<string, CircuitInfo>(Object.entries(CIRCUITS))

export const circuitFor = (circuitId: string) => byId.get(circuitId)

export const allCircuits = () => [...byId.values()]
