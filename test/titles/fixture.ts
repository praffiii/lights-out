import { titlesOf } from '../../src/titles/build.ts'
import { calendar2026, constructors2026r20, drivers2026r20, results2026r20, sprints2026r20 } from '../season/fake-jolpica.ts'

export const input2026 = {
  season: 2026,
  calendar: calendar2026.races,
  races: results2026r20.races,
  sprints: sprints2026r20.races,
  drivers: drivers2026r20,
  teams: constructors2026r20,
}

export const titles2026 = () => {
  const titles = titlesOf(2026, input2026.calendar, input2026.races, input2026.sprints)

  if (!titles) throw new Error('the 2026 fixture has no titles')

  return titles
}
