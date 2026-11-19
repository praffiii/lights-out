import { expect, it } from 'bun:test'

import { allCircuits, circuitFor } from '../../src/circuits/registry.ts'
import { calendar2026 } from '../season/fake-jolpica.ts'

it('has a model for every race from today to the end of the season', () => {
  const missing = calendar2026.races.filter((race) => race.round >= 20 && !circuitFor(race.circuit.circuitId)).map((race) => race.circuit.circuitId)

  expect(missing).toEqual([])
})

it('has a model for the 2027 opener at Albert Park', () => {
  expect(circuitFor('albert_park')?.model).toBe('au-1953')
})

it('gives every circuit a 400-point centreline that runs once round the lap', () => {
  for (const info of allCircuits()) {
    expect(info.line).toHaveLength(400)
    expect(info.line[0]?.u).toBe(0)
    expect(info.line.every((p, i, a) => i === 0 || p.u > (a[i - 1]?.u ?? 1))).toBe(true)
  }
})

it('gives every circuit a phone crop inside the poster', () => {
  for (const { crop } of allCircuits()) {
    expect(crop[0]).toBeGreaterThanOrEqual(0)
    expect(crop[2]).toBeLessThanOrEqual(1)
    expect(crop[2] - crop[0]).toBeGreaterThan(0.4)
  }
})

it('names every circuit by its registry id', () => {
  for (const id of ['interlagos', 'vegas', 'losail', 'yas_marina', 'albert_park', 'miami', 'monza']) expect(circuitFor(id)?.id).toBe(id)
})

it('models Miami from the us-2022 build', () => {
  const miami = circuitFor('miami')

  expect(miami?.model).toBe('us-2022')
  expect(miami?.cuts).toEqual([0.309, 0.648])
  expect(miami?.facts.turns).toBe(19)
  expect(miami?.pins).toHaveLength(19)
})

it('places every turn on the lap', () => {
  for (const info of allCircuits()) {
    expect(info.laps.map((t) => t.turn)).toEqual(info.pins.map((p) => p.turn))

    for (const { u } of info.laps) expect(u >= 0 && u < 1).toBe(true)
  }
})

it('runs the turns in lap order from the start line, wrapping at most once', () => {
  for (const info of allCircuits()) {
    const drops = info.laps.filter((t, i) => i > 0 && t.u < (info.laps[i - 1]?.u ?? 0)).length

    expect(drops).toBeLessThanOrEqual(1)
  }
})

it('models Monza from the it-1922 build, with its two grid marks', () => {
  const monza = circuitFor('monza')

  expect(monza?.model).toBe('it-1922')
  expect(monza?.openf1).toBe('Monza')
  expect(monza?.cuts).toEqual([0.3303, 0.6425])
  expect(monza?.facts).toEqual({ turns: 11, direction: 'clockwise', distanceKm: '306.720', lengthKm: '5.793', laps: 53, firstGp: 1950 })
  expect(monza?.pins).toHaveLength(11)
  expect(monza?.marks?.map((m) => m.name).sort()).toEqual(['grid-19', 'pole'])
  expect(monza?.marks?.every((m) => m.x > 0 && m.x < 1 && m.y > 0 && m.y < 1)).toBe(true)
})

it('gives marks only to the circuits that have them', () => {
  expect(allCircuits().flatMap((info) => (info.marks ? [info.id] : []))).toEqual(['monza'])
})
