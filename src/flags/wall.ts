import type { FlagRace, FlagTally } from './schema.ts'

type Quoted = keyof FlagRace['samples']

export type Quote = { circuit: string; lap: number; message: string }

export type Wall = {
  season: number
  races: number
  first: string
  latest: string
  clear: number
  yellow: number
  doubleYellow: number
  blue: number
  red: number
  redSessions: number
  blackWhite: number
  trackLimits: number
  safetyCars: number
  scRaces: number
  vscs: number
  vscRaces: number
  quotes: Partial<Record<Quoted, Quote>>
}

const QUOTED = ['clear', 'yellow', 'blue', 'chequered'] as const satisfies ReadonlyArray<Quoted>

const sum = (races: ReadonlyArray<FlagRace>, of: (race: FlagRace) => number) => races.reduce((total, race) => total + of(race), 0)

const had = (races: ReadonlyArray<FlagRace>, of: (race: FlagRace) => number) => races.filter((race) => of(race) > 0).length

const quote = (races: ReadonlyArray<FlagRace>, kind: Quoted): Quote | undefined => {
  const race = races.filter((r) => r.samples[kind]).at(-1)
  const sample = race?.samples[kind]

  return race && sample ? { circuit: race.circuit, ...sample } : undefined
}

export const count = (n: number): string => n.toLocaleString('en-GB')

export const races = (n: number): string => `${count(n)} ${n === 1 ? 'race' : 'races'}`

export function wallOf(tally: FlagTally): Wall {
  const { races } = tally
  const quotes: Partial<Record<Quoted, Quote>> = {}

  for (const kind of QUOTED) {
    const found = quote(races, kind)

    if (found) quotes[kind] = found
  }

  return {
    season: tally.season,
    races: races.length,
    first: races[0]?.circuit ?? '',
    latest: races.at(-1)?.circuit ?? '',
    clear: sum(races, (r) => r.clear),
    yellow: sum(races, (r) => r.yellow),
    doubleYellow: sum(races, (r) => r.doubleYellow),
    blue: sum(races, (r) => r.blue),
    red: sum(races, (r) => r.red),
    redSessions: tally.redSessions,
    blackWhite: sum(races, (r) => r.blackWhite),
    trackLimits: sum(races, (r) => r.blackWhiteTrackLimits),
    safetyCars: sum(races, (r) => r.safetyCars),
    scRaces: had(races, (r) => r.safetyCars),
    vscs: sum(races, (r) => r.vscs),
    vscRaces: had(races, (r) => r.vscs),
    quotes,
  }
}
