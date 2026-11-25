import { expect, it } from 'bun:test'

import { at, moments, trackDay } from '../../src/guide/moments.ts'
import { VEGAS } from '../../src/guide/vegas.ts'

it('tells the race in order, one chapter a moment', () => {
  expect(moments(VEGAS).map((m) => [m.lap, m.n, m.label, m.text])).toEqual([
    [0, '01', 'The grid', 'Verstappen starts first'],
    [2, '02', 'Lap 2 · Lead change', 'Russell passes Verstappen'],
    [12, '07', 'Lap 12 · Off track', 'Hamilton gets 10 s'],
    [19, '04', 'Lap 19 · Safety car', 'Everyone slows down'],
    [19, '03', 'Lap 19 · Pit stops', '16 cars stop'],
    [26, '06', 'Lap 26 · Overtake Mode', 'Back on after the safety car'],
    [39, '05', 'Lap 39 · 330 km/h', 'Leclerc, fastest at the speed trap'],
    [50, '08', 'Lap 50 · Chequered flag', 'Verstappen wins 25 points'],
  ])
})

it('links each moment to its chapter by name', () => {
  const [, pass] = moments(VEGAS)

  expect(pass?.to).toBe('/chapters/overtaking')
  expect(pass?.chapter).toBe('How overtaking works')
})

it('puts 02, 04 and 08 above the ruler', () => {
  expect(moments(VEGAS).flatMap((m) => (m.above ? [m.n] : []))).toEqual(['02', '04', '08'])
})

it('places a lap on the ruler', () => {
  expect(at(0, 50)).toBe(0)
  expect(at(19, 50)).toBe(0.38)
  expect(at(50, 50)).toBe(1)
})

it('writes the track date', () => {
  expect(trackDay(VEGAS.date)).toBe('21 November 2026')
})
