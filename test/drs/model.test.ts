import { expect, it } from 'bun:test'

import { progressAt, timeAt } from '../../src/chapter/pace.ts'
import { GHOST } from '../../src/drs/miami.ts'
import { at, barScale, camAt, END, flapFrame, gapText, ghostPace, sliderText, START, stops, timeOfMetres } from '../../src/drs/model.ts'

const end = at(GHOST, GHOST.end)

it('is level at the line with the flap shut', () => {
  const now = at(GHOST, 0)

  expect(now.metres).toBeCloseTo(0, 1)
  expect(Math.abs(now.laps[0].speed - 300)).toBeLessThan(1.5)
  expect(Math.abs(now.laps[1].speed - 300)).toBeLessThan(1.5)
  expect(now.flap).toBe(0)
  expect(gapText(now)).toBe('Level')
})

it('opens the flap in a third of a second', () => {
  expect(at(GHOST, 0.15).flap).toBeGreaterThan(0)
  expect(at(GHOST, 0.15).flap).toBeLessThan(1)
  expect(at(GHOST, 0.3).flap).toBe(1)
})

it('runs level before the line', () => {
  for (let t = START; t <= 0; t += 0.1) {
    expect(at(GHOST, t).open).toBe(false)
    expect(Math.abs(at(GHOST, t).metres)).toBeLessThan(1)
    expect(gapText(at(GHOST, t))).toBe('Level')
  }
})

it('ends with lap 53 about eighteen metres ahead and the flap open', () => {
  expect(end.metres).toBeGreaterThan(17)
  expect(end.metres).toBeLessThan(21)
  expect(end.seconds).toBeGreaterThan(0.17)
  expect(end.seconds).toBeLessThan(0.23)
  expect(end.open).toBe(true)
  expect(gapText(end)).toBe('18 m')
})

it('never loses ground in the zone', () => {
  let best = 0

  for (let t = 0; t <= GHOST.end; t += 0.05) {
    const { metres } = at(GHOST, t)

    expect(metres).toBeGreaterThan(best - 0.2)
    best = Math.max(best, metres)
  }
})

it('picks a wing frame for the flap', () => {
  expect(flapFrame(0, 24)).toBe(0)
  expect(flapFrame(1, 24)).toBe(23)
  expect(flapFrame(0.5, 24)).toBe(12)
})

it('says everything to the slider', () => {
  expect(sliderText(end)).toMatch(/^1,\d\d\d metres\. Lap 53 33\d, lap 54 31\d kilometres an hour\. Flap open, 1[78] metres ahead\.$/)
  expect(sliderText(at(GHOST, -2))).toMatch(/^\d\d\d metres\. Lap 53 28\d, lap 54 28\d kilometres an hour\. Flap shut, level\.$/)
})

it('gives the zone two thirds of the scroll', () => {
  const pace = ghostPace(GHOST)

  expect(END(GHOST)).toBeCloseTo(GHOST.end - START)
  expect(pace.at(-1)).toEqual([1, END(GHOST)])
  expect(1 - progressAt(pace, -START)).toBeCloseTo(0.66, 1)
})

it('maps the bar to metres from Turn 16 and clamps at the end of the zone', () => {
  const scale = barScale(GHOST)
  const length = (GHOST.to - GHOST.from) * GHOST.lengthM

  for (const t of [1, -START, 6, END(GHOST)]) {
    const { along } = at(GHOST, t + START)

    expect(timeAt(scale, along / length)).toBeCloseTo(t, 1)
  }

  expect(timeAt(scale, 1)).toBeCloseTo(END(GHOST), 5)
  expect(at(GHOST, timeOfMetres(GHOST, 900)).along).toBeCloseTo(900, 0)
})

it('steps every hundred metres', () => {
  const all = stops(GHOST)

  expect(all.length).toBeGreaterThan(6)
  expect(all.every((t, i) => i === 0 || t > (all[i - 1] ?? Infinity))).toBe(true)
  expect(Math.round(at(GHOST, (all[1] ?? 0) + START).along) % 100).toBe(0)
})

it('keeps the camera on the two cars and pushes in', () => {
  const first = camAt(GHOST, START)
  const last = camAt(GHOST, GHOST.end)

  expect(last.k).toBeGreaterThan(first.k)
  expect(last.u).toBeGreaterThan(first.u)
  expect(last.w).toBe(1)

  for (let t = START; t < GHOST.end; t += 0.1) expect(camAt(GHOST, t + 0.1).k).toBeGreaterThanOrEqual(camAt(GHOST, t).k - 1e-9)
})
