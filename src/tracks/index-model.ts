import { CALENDAR, type CalendarCircuit, labelOf } from '#/circuits/calendar.ts'
import { pickRace } from '#/season/weekend.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

export type IndexCell = { id: string; tile: string; round: number; label: string; lengthKm: string; to: string | null; lit: boolean }

export type IndexFacts = {
  count: number
  longest: { label: string; km: string }
  shortest: { label: string; km: string }
  newest: { label: string; line: string }
}

export const PAGED: ReadonlySet<string> = new Set(['vegas'])

const circuits: ReadonlyArray<[string, CalendarCircuit]> = Object.entries(CALENDAR)

const by = (pick: (a: CalendarCircuit, b: CalendarCircuit) => boolean) => {
  const [first, ...rest] = circuits

  if (!first) throw new Error('the calendar is empty')

  return rest.reduce((best, entry) => (pick(entry[1], best[1]) ? entry : best), first)
}

const km = (c: CalendarCircuit) => Number(c.lengthKm)

export function indexFacts(snapshot: SeasonSnapshot | undefined): IndexFacts {
  const [, longest] = by((a, b) => km(a) > km(b))
  const [, shortest] = by((a, b) => km(a) < km(b))
  const [newestId, newest] = by((a, b) => a.firstGp > b.firstGp)
  const locality = snapshot?.calendar.find((race) => race.circuit.circuitId === newestId)?.circuit.locality

  return {
    count: circuits.length,
    longest: { label: labelOf(longest), km: longest.lengthKm },
    shortest: { label: labelOf(shortest), km: shortest.lengthKm },
    newest: { label: labelOf(newest), line: locality ? `${locality}, ${newest.firstGp}` : String(newest.firstGp) },
  }
}

const litId = (snapshot: SeasonSnapshot | undefined, now: Date) => {
  const picked = snapshot ? pickRace(snapshot, now) : null

  return picked && picked.kind !== 'finale' ? picked.race.circuit.circuitId : null
}

export function indexCells(snapshot: SeasonSnapshot | undefined, now: Date): ReadonlyArray<IndexCell> {
  const lit = litId(snapshot, now)

  return circuits.map(([id, c], i) => ({
    id,
    tile: c.tile,
    round: i + 1,
    label: labelOf(c),
    lengthKm: c.lengthKm,
    to: PAGED.has(id) ? `/tracks/${id}` : null,
    lit: id === lit,
  }))
}
