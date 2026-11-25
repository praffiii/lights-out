import { expect, it } from 'bun:test'

import { dateText, heroText, sliderText, stateText, sum, teamName } from '../../src/titles/copy.ts'
import { frame, type Side } from '../../src/titles/model.ts'
import { FALLBACK } from '../../src/titles/titles.ts'
import { round, season } from './small.ts'

const SEASON = { ...FALLBACK, rounds: FALLBACK.rounds.slice(0, 21) }

const side = (lead: number, left: number, wonAt: number | null): Side => ({ rows: [], lead, left, wonAt })

it('writes the lead against what is left', () => {
  expect(heroText(side(119, 100, 18))).toEqual({ lead: '119', ahead: 'points ahead.', left: 'Only 100 left to win.' })
  expect(heroText(side(126, 172, null))).toEqual({ lead: '126', ahead: 'points ahead.', left: '172 left to win.' })
  expect(heroText(side(1, 50, null))).toEqual({ lead: '1', ahead: 'point ahead.', left: '50 left to win.' })
  expect(heroText(side(0, 50, null))).toEqual({ lead: '0', ahead: 'Level.', left: '50 left to win.' })
  expect(heroText(side(98, 0, 18))).toEqual({ lead: '98', ahead: 'points ahead.', left: 'No points left.' })
})

it('says when a title was won', () => {
  expect(stateText(side(119, 100, 18), SEASON)).toBe('Won · round 19')
  expect(stateText(side(126, 172, null), SEASON)).toBe('Still open')
})

it('dates a round without its year', () => {
  expect(dateText('2026-11-01')).toBe('1 November')
})

it('names a team the way the site does, or the way Jolpica does', () => {
  expect(teamName(SEASON, 'rb')).toBe('Racing Bulls')
  expect(teamName(season([]), 'red')).toBe('Red Racing')
})

it('tells the slider everything the stage shows', () => {
  expect(sliderText(SEASON, frame(SEASON, 18))).toBe('Round 19 of 23, Mexico City. Drivers: Antonelli 119 ahead, 100 left, won. Constructors: Mercedes 126 ahead, 172 left, open.')
})

it('adds up the champions of 2026', () => {
  expect(sum(SEASON)).toEqual({
    label: 'The season so far · after round 21',
    terms: [
      { points: 402, caption: "Antonelli · drivers' 1st" },
      { points: 264, caption: "Russell · drivers' 4th" },
    ],
    total: { points: 666, caption: "Mercedes · constructors' 1st" },
    headline: ['Both titles.', 'One team.'],
    body: "Antonelli won the drivers' title at Mexico City. Mercedes won the teams' title one race later, at São Paulo. It took both cars.",
    source: 'Standings: Jolpica F1 API, after the Las Vegas Grand Prix',
  })
})

it('labels a finished season', () => {
  expect(sum({ ...SEASON, left: [] }).label).toBe('The 2026 season · final')
})

it('tells apart two champions from different teams', () => {
  const t = season([round(1, [['ann', 'red', 60], ['bob', 'blue', 58], ['cat', 'blue', 55]])])
  const s = sum(t)

  expect(s.headline).toEqual(['Two titles.', 'Two teams.'])
  expect(s.body).toBe("Ann won the drivers' title at Place 1. Blue Racing won the teams' title the same day.")
})

it('starts with the teams when they were first', () => {
  const t = season([round(1, [['ann', 'red', 100], ['bob', 'red', 90]]), round(2, [['bob', 'red', 1]]), round(3, [['ann', 'red', 60]])], 1)

  expect(sum(t).body).toBe("Red Racing won the teams' title at Place 1. Ann won the drivers' title two races later, at Place 3. It took both cars.")
})

it('leaves the other title open', () => {
  const drivers = season([round(1, [['ann', 'red', 60], ['bob', 'blue', 30], ['cat', 'blue', 29]])], 1)
  const teams = season([round(1, [['ann', 'red', 60], ['bob', 'red', 59]])], 1)

  expect(sum(drivers).headline).toEqual(['One title won.', 'One still open.'])
  expect(sum(drivers).body).toBe("Ann won the drivers' title at Place 1. The other is still open, with 43 points left.")
  expect(sum(teams).body).toBe("Red Racing won the teams' title at Place 1. The other is still open, with 25 points left.")
})

it('folds a fourth driver into the others', () => {
  const s = sum(season([round(1, [['ann', 'red', 60], ['bob', 'red', 20], ['cat', 'red', 10], ['dan', 'red', 5]])]))

  expect(s.terms.map((t) => [t.points, t.caption])).toEqual([
    [60, "Ann · drivers' 1st"],
    [20, "Bob · drivers' 2nd"],
    [15, 'Others'],
  ])
})

it('judges a champion by the team they scored for last', () => {
  const t = season([round(1, [['ann', 'blue', 50], ['bob', 'red', 10]]), round(2, [['ann', 'red', 60], ['bob', 'red', 40]])])

  expect(sum(t).headline).toEqual(['Both titles.', 'One team.'])
})
