import { expect, it } from 'bun:test'
import { Effect } from 'effect'

import { calendarHead, calendarTiles, constructorRows, driverRows, driversCopy, person, team, titleFight, weekend, whoLed } from '../../src/season/page-model.ts'
import type { SeasonSnapshot } from '../../src/season/snapshot-schema.ts'
import { words } from '../../src/season/words.ts'
import { calendar2026, calendar2027Shifted } from './fake-jolpica.ts'
import { snapshotAt } from './snapshot.ts'

const at = async (iso: string, overrides: Parameters<typeof snapshotAt>[1] = {}) => ({ snapshot: await snapshotAt(iso, overrides), now: new Date(iso) })

const head = async (iso: string, overrides: Parameters<typeof snapshotAt>[1] = {}) => {
  const { snapshot, now } = await at(iso, overrides)

  return calendarHead(snapshot, now)
}

const band = async (iso: string, overrides: Parameters<typeof snapshotAt>[1] = {}) => {
  const { snapshot, now } = await at(iso, overrides)

  return weekend(snapshot, now)
}

const withRound20 = (change: (race: (typeof calendar2026.races)[number]) => (typeof calendar2026.races)[number]) => ({
  races: () => Effect.succeed({ ...calendar2026, races: calendar2026.races.map((race) => (race.round === 20 ? change(race) : race)) }),
})

it('spells small numbers and leaves big ones as digits', () => {
  expect(words(23)).toBe('twenty-three')
  expect(words(1)).toBe('one')
  expect(words(20)).toBe('twenty')
  expect(words(31)).toBe('31')
})

it('marks done, now and upcoming rounds on the calendar', async () => {
  const { snapshot, now } = await at('2026-11-06T15:00:00Z')
  const tiles = calendarTiles(snapshot, now)
  const tile = (round: number) => tiles.find((entry) => entry.round === round)

  expect(tiles).toHaveLength(23)
  expect([tile(19)?.state, tile(19)?.status]).toEqual(['done', 'Done'])
  expect([tile(20)?.state, tile(20)?.status, tile(20)?.code]).toEqual(['now', 'Now', 'BRA'])
  expect([tile(21)?.state, tile(21)?.status]).toEqual(['upcoming', ''])
  expect(await head('2026-11-06T15:00:00Z')).toEqual({
    label: 'The calendar · 23 rounds',
    count: 'Round 20 of 23',
    headline: 'Twenty-three circuits. Nineteen done, one live.',
  })
})

it('keeps the race weekend live until four hours after the race starts', async () => {
  const { snapshot, now } = await at('2026-11-08T19:00:00Z')
  const tile = calendarTiles(snapshot, now).find((entry) => entry.round === 20)

  expect(tile?.state).toBe('now')
  expect((await head('2026-11-08T19:00:00Z')).headline).toBe('Twenty-three circuits. Nineteen done, one live.')
})

it('counts the rounds to go between weekends', async () => {
  expect(await head('2026-11-12T12:00:00Z')).toMatchObject({ count: 'Round 21 of 23', headline: 'Twenty-three circuits. Twenty done, three to go.' })
})

it('reads none done before the season starts', async () => {
  expect((await head('2026-03-01T00:00:00Z')).headline).toBe('Twenty-three circuits. None done yet.')
})

it('reads all done after the finale and points at next season', async () => {
  const next = { races: (season: number | 'current') => Effect.succeed(season === 2027 ? calendar2027Shifted : calendar2026) }

  expect(await head('2026-12-20T00:00:00Z', next)).toMatchObject({ count: 'Season complete', headline: 'Twenty-three circuits. All done.' })
  expect((await band('2026-12-20T00:00:00Z', next))?.label).toBe('Next race · 2027 · Round 1')
})

it('shows the last race as done when next season is not out', async () => {
  const last = await band('2026-12-20T00:00:00Z')

  expect(last?.label).toBe('Last race · Round 23')
  expect(last?.sessions.every((session) => session.status === 'Done')).toBe(true)
})

it('lays out this weekend with days in track time and the next session', async () => {
  const now = await band('2026-11-07T12:00:00Z')

  expect(now?.label).toBe('This weekend · Round 20')
  expect(now?.title).toBe('São Paulo Grand Prix.')
  expect(now?.facts?.name).toBe('Interlagos')
  expect(now?.sessions.map((session) => session.label)).toEqual(['Practice 1', 'Practice 2', 'Practice 3', 'Qualifying', 'Race'])
  expect(now?.sessions.map((session) => session.day)).toEqual(['Fri', 'Fri', 'Sat', 'Sat', 'Sun'])
  expect(now?.sessions.map((session) => session.status)).toEqual(['Done', 'Done', 'Next · 02h 30m', 'Later', 'Later'])
  expect(now?.sessions.map((session) => session.next)).toEqual([false, false, true, false, false])
})

it('counts days when the next session is more than a day away', async () => {
  expect((await band('2026-11-05T10:30:00Z'))?.sessions[0]?.status).toBe('Next · 1d 05h')
})

it('marks a session in progress as live and next', async () => {
  const live = (await band('2026-11-07T15:00:00Z'))?.sessions[2]

  expect([live?.status, live?.next]).toEqual(['Live', true])
})

it('reads Time TBC for an unconfirmed session', async () => {
  const unconfirmed = withRound20((race) => ({ ...race, sessions: race.sessions.map((session) => (session.name === 'Race' ? { ...session, timeConfirmed: false } : session)) }))

  expect((await band('2026-11-07T12:00:00Z', unconfirmed))?.sessions.at(-1)?.status).toBe('Time TBC')
})

it('names the next race between weekends', async () => {
  expect((await band('2026-11-12T12:00:00Z'))?.label).toBe('Next race · Round 21')
})

it('keeps the sessions of a circuit it has no facts for', async () => {
  const unknown = withRound20((race) => ({ ...race, circuit: { ...race.circuit, circuitId: 'nowhere' } }))
  const now = await band('2026-11-07T12:00:00Z', unknown)

  expect(now?.facts).toBeUndefined()
  expect(now?.sessions).toHaveLength(5)
})

const base = await snapshotAt('2026-11-06T15:00:00Z')

const standings = base.driverStandings

const latestRace = base.latest?.race

if (!standings || !latestRace?.race || !base.history) throw new Error('fixture has no standings, latest race or history')

const latestRef = latestRace.race

const { history: _history, ...noHistory } = base

const withLatestRound = (snapshot: SeasonSnapshot, round: number): SeasonSnapshot => ({
  ...snapshot,
  latest: snapshot.latest && { ...snapshot.latest, race: { ...latestRace, race: { ...latestRef, round } } },
})

const twoAt = (points: [number, number], round: number): SeasonSnapshot => {
  const mclaren = standings.rows.find((row) => row.driver.code === 'NOR')?.constructors ?? []
  const rows = standings.rows.slice(0, 2).map((row, i) => ({ ...row, points: points[i] ?? 0, constructors: mclaren }))

  return { ...base, latest: null, driverStandings: { ...standings, round, rows } }
}

it('reads an open fight with the rounds and points still to win', () => {
  const fight = titleFight(twoAt([300, 290], 17))

  expect(fight).toMatchObject({ state: 'open', gap: 10, label: 'The 2026 title fight · after round 17' })
  expect(fight?.line).toBe('Six rounds left, 150 points still to win. Same team, same car, one title.')
})

it('names the round a decided title was settled at', () => {
  const fight = titleFight(base)

  expect(fight).toMatchObject({ gap: 119, state: 'decided', label: 'The 2026 title fight · after round 19', firstPoints: 380, secondPoints: 261 })
  expect(fight?.line).toBe('Antonelli is the 2026 champion. It was settled at the Mexico City Grand Prix, with four rounds to spare.')
})

it('reads a decided title without history', () => {
  expect(titleFight(noHistory)?.line).toBe('Antonelli is the 2026 champion, with four rounds still to run.')
})

it('keeps a gap equal to the points left open', () => {
  expect(titleFight(twoAt([300, 150], 17))?.state).toBe('open')
})

it('reads a finished season as over', () => {
  const final = withLatestRound(base, 23)

  expect(titleFight(final)).toMatchObject({ state: 'over', label: 'The 2026 title fight · final' })
  expect(titleFight(final)?.line).toBe('Antonelli is the 2026 champion. It was settled at the Mexico City Grand Prix, with four rounds to spare.')
  expect(titleFight({ ...withLatestRound(noHistory, 23) })?.line).toBe('Antonelli is the 2026 champion.')
})

it('falls back to last season before round 1', () => {
  const lastSeason: SeasonSnapshot = { ...base, latest: null, driverStandings: { ...standings, season: 2025 } }

  expect(titleFight(lastSeason)).toMatchObject({ state: 'over', label: 'The 2025 title fight · final', line: 'Antonelli is the 2025 champion.' })
})

it('uses the standings round when the results agree with it', () => {
  expect(titleFight(withLatestRound(noHistory, 20))?.line).toBe('Antonelli is the 2026 champion, with three rounds still to run.')
})

it('has no title fight without two standings rows', () => {
  expect(titleFight({ ...base, driverStandings: null })).toBeNull()
  expect(titleFight({ ...base, driverStandings: { ...standings, rows: standings.rows.slice(0, 1) } })).toBeNull()
})

it('sums up the gaps at the front', () => {
  expect(driversCopy(standings.rows)).toBe('The front three are covered by 121 points. Fourth is 9 points behind third.')
  expect(driversCopy([{ points: 30 }, { points: 20 }, { points: 10 }, { points: 9 }])).toBe('The front three are covered by 20 points. Fourth is 1 point behind third.')
})

it('shows a driver outside the car list by their Jolpica name in a muted colour', () => {
  const camara = standings.rows.find((row) => row.driver.familyName === 'Camara')

  if (!camara) throw new Error('fixture has no Camara')

  const shown = person(camara.driver)

  expect([shown.code, shown.name, shown.colour, shown.car, shown.portrait]).toEqual([null, 'Rafael Camara', 'var(--muted)', undefined, undefined])
  expect(person(standings.rows[0]?.driver ?? camara.driver)).toMatchObject({ name: 'Kimi Antonelli', family: 'Antonelli', colour: '#27F4D2' })
})

it('maps Jolpica constructors to the site team names', () => {
  expect(team({ constructorId: 'rb', name: 'RB F1 Team', nationality: 'Italian' })).toEqual({ id: 'rb', name: 'Racing Bulls', colour: '#6692FF' })
  expect(team({ constructorId: 'nobody', name: 'Nobody Racing', nationality: 'British' })).toEqual({ id: 'nobody', name: 'Nobody Racing', colour: 'var(--muted)' })
})

it('puts each driver in the team they last raced for', () => {
  const rows = driverRows(base)
  const lawson = rows?.rest.find((row) => row.person.code === 'LAW')

  expect(rows?.podium.map((row) => [row.person.code, row.gap])).toEqual([
    ['ANT', ''],
    ['VER', '+119'],
    ['HAM', '+121'],
  ])
  expect([lawson?.position, lawson?.team.name]).toEqual([9, 'Racing Bulls'])
  expect(driverRows({ ...base, driverStandings: null })).toBeNull()
})

it('splits each team total into its drivers', () => {
  const rows = constructorRows(base)
  const parts = (id: string) => rows.find((row) => row.team.id === id)

  expect(parts('red_bull')).toMatchObject({ total: 382, parts: [{ label: 'VER', points: 261 }, { label: 'HAD', points: 107 }, { label: 'Others', points: 14 }] })
  expect(parts('mclaren')).toMatchObject({ total: 365, parts: [{ label: 'NOR', points: 221 }, { label: 'PIA', points: 144 }] })
  expect(parts('cadillac')).toMatchObject({ total: 0, parts: [] })
  expect(rows).toHaveLength(11)

  for (const row of rows) {
    expect(row.parts.every((part) => part.points > 0)).toBe(true)
    expect(row.parts.length === 0 || row.parts.reduce((sum, part) => sum + part.points, 0) === row.total).toBe(true)
  }
})

it('shows totals only when history and standings disagree', () => {
  const history = base.history

  if (!history) throw new Error('fixture has no history')

  const behind = { ...base, history: { ...history, round: 18 } }
  const off = { ...base, history: { ...history, teams: history.teams.map((entry) => (entry.driver.code === 'VER' ? { ...entry, points: entry.points + 1 } : entry)) } }

  expect(constructorRows(behind).every((row) => row.parts.length === 0)).toBe(true)
  expect(constructorRows(off).find((row) => row.team.id === 'red_bull')?.parts).toEqual([])
  expect(constructorRows(noHistory).every((row) => row.parts.length === 0)).toBe(true)
})

it('strips who led the championship into stints', () => {
  const led = whoLed(base, new Date('2026-11-06T15:00:00Z'))

  expect(led?.stints.map((stint) => [stint.person.code, stint.from, stint.to, stint.photo, stint.current])).toEqual([
    ['RUS', 1, 2, 'portrait', false],
    ['ANT', 3, 19, 'car', true],
  ])
  expect([led?.changes, led?.columns, led?.live, led?.leads.length]).toEqual([[3], 23, 20, 19])
  expect(led?.line).toBe('Each column is one round. The photo shows who led the championship after it. Two drivers have led this season.')
  expect(whoLed(base, new Date('2026-11-12T12:00:00Z'))?.live).toBeNull()
})

it('counts a driver who takes the lead back once', () => {
  const history = base.history

  if (!history) throw new Error('fixture has no history')

  const rus = history.leaders[0]?.driver

  if (!rus) throw new Error('fixture has no leader')

  const back = { ...base, history: { ...history, leaders: history.leaders.map((leader) => (leader.round >= 18 ? { ...leader, driver: rus } : leader)) } }
  const led = whoLed(back, new Date('2026-11-06T15:00:00Z'))

  expect(led?.stints.map((stint) => stint.person.code)).toEqual(['RUS', 'ANT', 'RUS'])
  expect(led?.line).toBe('Each column is one round. The photo shows who led the championship after it. Two drivers have led this season.')
})

it('says when one driver has led every round', () => {
  const history = base.history

  if (!history) throw new Error('fixture has no history')

  const ant = history.leaders.at(-1)?.driver ?? history.leaders[0]?.driver

  if (!ant) throw new Error('fixture has no leader')

  const solo = { ...base, history: { ...history, leaders: history.leaders.map((leader) => ({ ...leader, driver: ant })) } }

  expect(whoLed(solo, new Date('2026-11-06T15:00:00Z'))?.line).toBe('Each column is one round. The photo shows who led the championship after it. Antonelli has led every round.')
  expect(whoLed(noHistory, new Date('2026-11-06T15:00:00Z'))).toBeNull()
})
