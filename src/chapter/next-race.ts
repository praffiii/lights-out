import { pickRace, RACE_WHEN } from '#/season/weekend.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

export type NextRace = { round: number; place: string; when: string }

export function nextRace(snapshot: SeasonSnapshot | undefined, now: Date): NextRace | null {
  const picked = snapshot ? pickRace(snapshot, now) : null

  if (!picked || picked.kind === 'finale') return null

  return { round: picked.round, place: picked.race.circuit.locality, when: RACE_WHEN[picked.kind] }
}
