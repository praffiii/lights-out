import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { type RaceControl, RaceControlResponse } from '../../src/flags/schema.ts'
import { countRace, finishedRaces, frozen, redSessionCount } from '../../src/flags/tally.ts'
import { sessions2026 } from '../season/fake-openf1.ts'

const rows = async (name: string) => Schema.decodeUnknownSync(RaceControlResponse)(await Bun.file(`test/fixtures/openf1/${name}.json`).json())

const suzukaRows = await rows('race-control-11253')
const hungaroringRows = await rows('race-control-11342')
const redRows = await rows('red-2026')

const session = (key: number) => {
  const found = sessions2026.find((s) => s.session_key === key)

  if (!found) throw new Error(`session ${key} is in the fixture`)

  return found
}

const row = (fields: Partial<RaceControl>): RaceControl => ({ session_key: 11253, lap_number: 10, category: 'Other', flag: null, message: '', ...fields })

it('counts Suzuka by the rules', () => {
  expect(countRace(session(11253), suzukaRows)).toMatchObject({
    sessionKey: 11253,
    circuit: 'Suzuka',
    clear: 6,
    yellow: 2,
    doubleYellow: 2,
    blue: 10,
    red: 0,
    chequered: 1,
    blackWhite: 1,
    blackWhiteTrackLimits: 0,
    safetyCars: 1,
    vscs: 0,
  })
})

it('counts Hungaroring by the rules', () => {
  expect(countRace(session(11342), hungaroringRows)).toMatchObject({
    clear: 6,
    yellow: 5,
    doubleYellow: 2,
    blue: 11,
    chequered: 1,
    blackWhite: 1,
    blackWhiteTrackLimits: 1,
    safetyCars: 0,
    vscs: 1,
  })
})

it('a VSC is not a safety car', () => {
  expect(countRace(session(11253), [row({ category: 'SafetyCar', message: 'VSC DEPLOYED' })])).toMatchObject({ vscs: 1, safetyCars: 0 })
  expect(countRace(session(11253), [row({ category: 'SafetyCar', message: 'SAFETY CAR ENDING' })])).toMatchObject({ vscs: 0, safetyCars: 0 })
})

it('a black-and-white flag counts for track limits only when the message says so', () => {
  const warned = [
    row({ category: 'Flag', flag: 'BLACK AND WHITE', message: 'BLACK AND WHITE FLAG FOR CAR 4 (NOR) - TRACK LIMITS' }),
    row({ category: 'Flag', flag: 'BLACK AND WHITE', message: 'BLACK AND WHITE FLAG FOR CAR 4 (NOR) - MOVING UNDER BRAKING' }),
  ]

  expect(countRace(session(11253), warned)).toMatchObject({ blackWhite: 2, blackWhiteTrackLimits: 1 })
})

it('samples quote the first message with a lap number', () => {
  const race = countRace(session(11253), suzukaRows)
  const blue = suzukaRows.find((r) => r.flag === 'BLUE' && r.lap_number !== null)

  expect(blue).toBeDefined()
  expect(race.samples.blue).toMatchObject({ lap: blue?.lap_number ?? -1, message: blue?.message ?? '' })
  expect(countRace(session(11253), [row({ category: 'Flag', flag: 'BLUE', lap_number: null, message: 'WAVED BLUE FLAG' })]).samples).toEqual({})
})

it('finishedRaces skips cancelled races, sprints and races still running', () => {
  const done = finishedRaces(sessions2026, new Date('2026-11-15T00:00:00Z'))

  expect(done).toHaveLength(20)
  expect(done[0]?.circuit_short_name).toBe('Melbourne')
  expect(done.at(-1)?.circuit_short_name).toBe('Interlagos')
  expect(done.map((s) => s.circuit_short_name)).not.toContain('Sakhir')
  expect(done.map((s) => s.circuit_short_name)).not.toContain('Jeddah')

  const interlagos = session(11412)
  const running = finishedRaces(sessions2026, new Date(Date.parse(interlagos.date_end) + 20 * 60_000))

  expect(running.at(-1)?.circuit_short_name).toBe('Mexico City')
})

it('frozen after 48 hours', () => {
  const dateEnd = '2026-11-08T19:00:00+00:00'
  const hours = (h: number) => new Date(Date.parse(dateEnd) + h * 3_600_000)

  expect(frozen({ dateEnd }, hours(47))).toBe(false)
  expect(frozen({ dateEnd }, hours(49))).toBe(true)
})

it('redSessionCount skips testing days', () => {
  expect(redSessionCount(sessions2026, redRows)).toBe(26)
})

it('a row without a date still decodes', () => {
  const decoded = Schema.decodeUnknownSync(RaceControlResponse)([{ session_key: 1, lap_number: 3, category: 'Flag', flag: 'BLUE', message: 'WAVED BLUE FLAG FOR CAR 1 (NOR)' }])

  expect(decoded).toHaveLength(1)
})
