import type { ModelledId } from '#/circuits/modelled.ts'
import { titleFight } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { pickRace, RACE_WHEN } from '#/season/weekend.ts'
import { capital, words } from '#/season/words.ts'

import type { HistoryRow, TrackPage } from './pages.ts'

export const heroLabel = (id: ModelledId, page: TrackPage, snapshot: SeasonSnapshot | undefined) => {
  const race = snapshot?.calendar.find((r) => r.circuit.circuitId === id)

  return race ? `The tracks · Round ${race.round} · ${page.country}` : `The tracks · ${page.country}`
}

export const liveRow = (id: ModelledId, snapshot: SeasonSnapshot | undefined, now: Date): HistoryRow | null => {
  const picked = snapshot ? pickRace(snapshot, now) : null

  if (!snapshot || !picked || picked.kind === 'finale' || picked.race.circuit.circuitId !== id) return null

  const fight = titleFight(snapshot)
  const champion = fight && fight.state !== 'open' ? ` ${fight.first.family} arrives as champion.` : ''

  return { year: picked.race.season, line: `Round ${picked.round}, ${RACE_WHEN[picked.kind]}.${champion}` }
}

export const turnsWord = (n: number) => capital(words(n))
