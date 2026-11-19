import { CALENDAR, type CalendarCircuit } from './calendar.ts'
import type { ModelledId } from './modelled.ts'
import ae2009Line from './lines/ae-2009.json'
import ae2009 from './pins/ae-2009.json'
import au1953Line from './lines/au-1953.json'
import au1953 from './pins/au-1953.json'
import br1940Line from './lines/br-1940.json'
import br1940 from './pins/br-1940.json'
import it1922Line from './lines/it-1922.json'
import it1922 from './pins/it-1922.json'
import qa2004Line from './lines/qa-2004.json'
import qa2004 from './pins/qa-2004.json'
import us2022Line from './lines/us-2022.json'
import us2022 from './pins/us-2022.json'
import us2023Line from './lines/us-2023.json'
import us2023 from './pins/us-2023.json'

export type LinePoint = { u: number; x: number; y: number; z: number }

export type Crop = readonly [x0: number, y0: number, x1: number, y1: number]

export type Pin = { turn: number; x: number; y: number }

export type Mark = { name: string; x: number; y: number }

export type TurnLap = { turn: number; u: number }

export type CircuitFacts = {
  firstGp: number
  lengthKm: string
  laps: number
  distanceKm: string
  turns: number
  direction: 'clockwise' | 'anticlockwise'
}

export type CircuitInfo = {
  id: string
  model: string
  name: string
  gp: string
  tz: string
  openf1: string
  corner?: { turn: number; name: string }
  facts: CircuitFacts
  pins: ReadonlyArray<Pin>
  laps: ReadonlyArray<TurnLap>
  line: ReadonlyArray<LinePoint>
  crop: Crop
  cuts: readonly [number, number]
  marks?: ReadonlyArray<Mark>
}

type PinsJson = Readonly<Record<string, ReadonlyArray<number> | Readonly<Record<string, number>> | null>>

const isPoint = (at: PinsJson[string]): at is ReadonlyArray<number> => Array.isArray(at)

const pinsOf = (json: PinsJson): ReadonlyArray<Pin> =>
  Object.entries(json)
    .flatMap(([name, at]) => {
      const turn = Number(name.replace('turn-', ''))
      const [x, y] = name.startsWith('turn-') && isPoint(at) ? at : []

      return x !== undefined && y !== undefined ? [{ turn, x, y }] : []
    })
    .sort((a, b) => a.turn - b.turn)

const marksOf = (json: PinsJson): ReadonlyArray<Mark> =>
  Object.entries(json).flatMap(([name, at]) => {
    const [x, y] = name.startsWith('mark-') && isPoint(at) ? at : []

    return x !== undefined && y !== undefined ? [{ name: name.slice('mark-'.length), x, y }] : []
  })

const lapsOf = (json: { laps: Record<string, number> }, pins: ReadonlyArray<Pin>): ReadonlyArray<TurnLap> =>
  pins.map(({ turn }) => {
    const u = json.laps[String(turn)]

    if (u === undefined) throw new Error(`pins json has no lap for turn ${turn}`)

    return { turn, u }
  })

const cropOf = ({ crop: [x0, y0, x1, y1] }: { crop: ReadonlyArray<number> }): Crop => {
  if (x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined) throw new Error('pins json has no crop')

  return [x0, y0, x1, y1]
}

const fromCalendar = ({ tile, name, gp, tz }: CalendarCircuit) => ({ model: tile, name, gp, tz })

const factsOf = ({ firstGp, lengthKm, laps }: CalendarCircuit, rest: Omit<CircuitFacts, 'firstGp' | 'lengthKm' | 'laps'>): CircuitFacts => ({ firstGp, lengthKm, laps, ...rest })

const CIRCUITS = {
  interlagos: {
    ...fromCalendar(CALENDAR.interlagos),
    openf1: 'Interlagos',
    corner: { turn: 1, name: 'S do Senna' },
    facts: factsOf(CALENDAR.interlagos, { distanceKm: '305.879', turns: 15, direction: 'anticlockwise' }),
    pins: pinsOf(br1940),
    laps: lapsOf(br1940, pinsOf(br1940)),
    line: br1940Line,
    crop: cropOf(br1940),
    cuts: [0.282, 0.73],
  },
  vegas: {
    ...fromCalendar(CALENDAR.vegas),
    openf1: 'Las Vegas',
    corner: { turn: 7, name: 'Sphere chicane' },
    facts: factsOf(CALENDAR.vegas, { distanceKm: '309.958', turns: 17, direction: 'anticlockwise' }),
    pins: pinsOf(us2023),
    laps: lapsOf(us2023, pinsOf(us2023)),
    line: us2023Line,
    crop: cropOf(us2023),
    cuts: [0.243, 0.518],
  },
  losail: {
    ...fromCalendar(CALENDAR.losail),
    openf1: 'Lusail',
    facts: factsOf(CALENDAR.losail, { distanceKm: '308.611', turns: 16, direction: 'clockwise' }),
    pins: pinsOf(qa2004),
    laps: lapsOf(qa2004, pinsOf(qa2004)),
    line: qa2004Line,
    crop: cropOf(qa2004),
    cuts: [0.343, 0.635],
  },
  yas_marina: {
    ...fromCalendar(CALENDAR.yas_marina),
    openf1: 'Yas Marina Circuit',
    facts: factsOf(CALENDAR.yas_marina, { distanceKm: '306.188', turns: 16, direction: 'anticlockwise' }),
    pins: pinsOf(ae2009),
    laps: lapsOf(ae2009, pinsOf(ae2009)),
    line: ae2009Line,
    crop: cropOf(ae2009),
    cuts: [0.211, 0.657],
  },
  albert_park: {
    ...fromCalendar(CALENDAR.albert_park),
    openf1: 'Melbourne',
    facts: factsOf(CALENDAR.albert_park, { distanceKm: '306.124', turns: 14, direction: 'clockwise' }),
    pins: pinsOf(au1953),
    laps: lapsOf(au1953, pinsOf(au1953)),
    line: au1953Line,
    crop: cropOf(au1953),
    cuts: [0.328, 0.6],
  },
  miami: {
    ...fromCalendar(CALENDAR.miami),
    openf1: 'Miami',
    facts: factsOf(CALENDAR.miami, { distanceKm: '308.326', turns: 19, direction: 'anticlockwise' }),
    pins: pinsOf(us2022),
    laps: lapsOf(us2022, pinsOf(us2022)),
    line: us2022Line,
    crop: cropOf(us2022),
    cuts: [0.309, 0.648],
  },
  monza: {
    ...fromCalendar(CALENDAR.monza),
    openf1: 'Monza',
    facts: factsOf(CALENDAR.monza, { distanceKm: '306.720', turns: 11, direction: 'clockwise' }),
    pins: pinsOf(it1922),
    laps: lapsOf(it1922, pinsOf(it1922)),
    line: it1922Line,
    crop: cropOf(it1922),
    cuts: [0.3303, 0.6425],
    marks: marksOf(it1922),
  },
} satisfies Record<ModelledId, Omit<CircuitInfo, 'id'>>

const byId = new Map<string, CircuitInfo>(Object.entries(CIRCUITS).map(([id, c]) => [id, { ...c, id }]))

export const circuitFor = (circuitId: string) => byId.get(circuitId)

export const allCircuits = () => [...byId.values()]
