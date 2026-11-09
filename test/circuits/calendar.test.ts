import { expect, it } from 'bun:test'

import { CALENDAR, calendarCircuit, grandPrix } from '../../src/circuits/calendar.ts'
import { gpName } from '../../src/season/weekend.ts'
import { calendar2026 } from '../season/fake-jolpica.ts'

const layouts = new Set<string>(
  (await Bun.file('blender/circuits/data/f1-circuits.geojson').json()).features.map((feature: { properties: { id: string } }) => feature.properties.id),
)

it('every 2026 calendar circuit has an entry', () => {
  const missing = calendar2026.races.map((race) => race.circuit.circuitId).filter((id) => !calendarCircuit(id))

  expect(missing).toEqual([])
  expect(calendar2026.races).toHaveLength(23)
})

it('every tile id is a bacinger layout', () => {
  const unknown = Object.values(CALENDAR)
    .map((circuit) => circuit.tile)
    .filter((tile) => !layouts.has(tile))

  expect(unknown).toEqual([])
})

it('facts are well-formed', () => {
  for (const circuit of Object.values(CALENDAR)) {
    expect([circuit.code, circuit.lengthKm]).toEqual([circuit.code, expect.stringMatching(/^\d\.\d{3}$/)])
    expect(circuit.code).toMatch(/^[A-Z]{3}$/)
    expect(circuit.laps).toBeGreaterThanOrEqual(40)
    expect(circuit.laps).toBeLessThanOrEqual(80)
    expect(circuit.firstGp).toBeGreaterThanOrEqual(1950)
    expect(circuit.firstGp).toBeLessThanOrEqual(2026)
    expect(() => new Intl.DateTimeFormat('en-GB', { timeZone: circuit.tz })).not.toThrow()
  }
})

it('a short race name reads in full', () => {
  expect(grandPrix('Las Vegas GP')).toBe('Las Vegas Grand Prix')
  expect(grandPrix('Bahrain GP in Malaysia')).toBe('Bahrain Grand Prix in Malaysia')
})

it('the weekend box keeps its short race names', () => {
  const race = (circuitId: string) => calendar2026.races.find((entry) => entry.circuit.circuitId === circuitId)
  const interlagos = race('interlagos')
  const sepang = race('sepang')

  if (!interlagos || !sepang) throw new Error('fixture has no Interlagos or Sepang')

  expect(gpName(interlagos)).toBe('São Paulo GP')
  expect(gpName(sepang)).toBe('Bahrain GP in Malaysia')
})
