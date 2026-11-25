import { expect, it } from 'bun:test'

import { type Control, firstOnGrid, firstPass, type Lap, lapAt, offTrack, overtakeBack, safetyCarLap, stopsOn, trackDate, trapBest } from '../../src/guide/facts.ts'

const at = (minute: number, second = 0) => `2026-11-22T04:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+00:00`

const lap = (driver_number: number, lap_number: number, minute: number, st_speed: number | null = null): Lap => ({ driver_number, lap_number, date_start: at(minute), st_speed })

const control = (minute: number, lap_number: number | null, message: string, second = 0): Control => ({ date: at(minute, second), lap_number, message })

const LAPS = [lap(3, 1, 3), lap(63, 1, 3), lap(3, 2, 5), lap(63, 2, 6), lap(3, 3, 8)]

it('dates the race on the day at the track', () => {
  expect(trackDate('2026-11-22T04:00:00+00:00', '-08:00:00')).toBe('2026-11-21')
  expect(trackDate('2026-03-08T04:00:00+00:00', '11:00:00')).toBe('2026-03-08')
})

it('finds who starts first, from each driver’s first position', () => {
  expect(
    firstOnGrid([
      { date: at(4), driver_number: 63, position: 1 },
      { date: at(1), driver_number: 63, position: 2 },
      { date: at(1), driver_number: 3, position: 1 },
    ]),
  ).toBe(3)
  expect(firstOnGrid([])).toBeNull()
})

it('reads the lap from the first car to start it', () => {
  expect(lapAt(LAPS, at(2))).toBe(0)
  expect(lapAt(LAPS, at(5, 30))).toBe(2)
  expect(lapAt(LAPS, at(9))).toBe(3)
})

it('takes the first pass for the lead after lap 1', () => {
  const passes = [
    { date: at(6, 50), overtaking_driver_number: 63, overtaken_driver_number: 3, position: 1 },
    { date: at(4), overtaking_driver_number: 6, overtaken_driver_number: 3, position: 1 },
    { date: at(5, 30), overtaking_driver_number: 1, overtaken_driver_number: 6, position: 3 },
  ]

  expect(firstPass(passes, LAPS)).toEqual({ by: 63, on: 3, lap: 2 })
  expect(firstPass([], LAPS)).toBeNull()
})

const NOTED = control(23, 13, 'TURN 8 INCIDENT INVOLVING CARS 44 (HAM) AND 1 (NOR) NOTED - LEAVING THE TRACK AND GAINING AN ADVANTAGE (19:27:52)', 55)
const DELETED = control(24, 13, 'CAR 44 (HAM) TIME 1:40.250 DELETED - TRACK LIMITS AT TURN 8 LAP 12 20:22:41', 1)
const PENALTY = control(31, 17, 'FIA STEWARDS: 10 SECOND TIME PENALTY FOR CAR 44 (HAM) - LEAVING THE TRACK AND GAINING AN ADVANTAGE (20:22:42)')

it('ties the penalty to the lap of the deleted time', () => {
  const later = control(40, 40, 'CAR 44 (HAM) TIME 1:45.913 DELETED - TRACK LIMITS AT TURN 8 LAP 38 21:11:13')
  const served = control(41, 22, 'FIA STEWARDS: PENALTY SERVED - 10 SECOND TIME PENALTY FOR CAR 44 (HAM) - LEAVING THE TRACK AND GAINING AN ADVANTAGE (20:22:42)')

  expect(offTrack([NOTED, DELETED, PENALTY, later, served])).toEqual({ driver: 44, lap: 12, seconds: 10 })
})

it('has no penalty without the stewards’ message or the deleted lap', () => {
  expect(offTrack([NOTED, DELETED])).toBeNull()
  expect(offTrack([NOTED, PENALTY])).toBeNull()
})

it('finds the safety car and skips the virtual one', () => {
  expect(safetyCarLap([control(1, 4, 'VSC DEPLOYED'), control(2, 19, 'SAFETY CAR DEPLOYED')])).toBe(19)
  expect(safetyCarLap([control(1, 4, 'VSC DEPLOYED')])).toBeNull()
})

it('counts a car once, and only when its tyres changed', () => {
  const pits = [
    { driver_number: 3, lap_number: 19 },
    { driver_number: 3, lap_number: 19 },
    { driver_number: 63, lap_number: 19 },
    { driver_number: 1, lap_number: 20 },
  ]

  const stints = [
    { driver_number: 3, lap_start: 1, lap_end: 19 },
    { driver_number: 3, lap_start: 20, lap_end: 50 },
    { driver_number: 63, lap_start: 1, lap_end: 50 },
    { driver_number: 1, lap_start: 1, lap_end: 19 },
    { driver_number: 1, lap_start: 20, lap_end: 50 },
  ]

  expect(stopsOn(19, pits, stints)).toBe(1)
  expect(stopsOn(30, pits, stints)).toBe(0)
})

it('finds Overtake Mode coming back after the safety car', () => {
  expect(overtakeBack([control(4, 1, 'OVERTAKE ENABLED'), control(5, 26, 'OVERTAKE ENABLED')], 19)).toBe(26)
  expect(overtakeBack([control(4, 1, 'OVERTAKE ENABLED')], 19)).toBeNull()
})

it('finds the fastest car at the speed trap', () => {
  expect(trapBest([lap(81, 28, 1, 325), lap(16, 39, 1, 330), lap(1, 2, 1)])).toEqual({ driver: 16, lap: 39, kmh: 330 })
  expect(trapBest([lap(1, 2, 1)])).toBeNull()
})
