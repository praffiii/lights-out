import { expect, test } from 'bun:test'

import { Schema } from 'effect'

import baked from '#/fight/melbourne.json'
import { camAt, END, leads, readout, sliderText, steps } from '#/fight/model.ts'
import { FightFile } from '#/fight/schema.ts'
import type { PoleRow } from '#/pole/schema.ts'

const file = Schema.decodeUnknownSync(FightFile)(baked)

const all = (() => {
  const s = steps(file)

  if (!s) throw new Error('the baked fight has no steps')

  return s
})()

const text = (t: number) => sliderText(file, all, leads(file), t)

const flicker = (seconds: number): FightFile => {
  const from = 48 - seconds / 2
  const times = Array.from({ length: 193 }, (_, i) => i / 2)
  const row = (t: number, ahead: number): PoleRow => [t, t / 100 + ahead / file.lengthM, 250, 7, 100, 0]
  const edges = [from - 0.001, from, from + seconds, from + seconds + 0.001]
  const at = [...times, ...edges].sort((a, b) => a - b)

  return {
    ...file,
    cars: [
      { ...file.cars[0], rows: at.map((t) => row(t, 0)) },
      { ...file.cars[1], rows: at.map((t) => row(t, t >= from && t <= from + seconds ? 10 : -10)) },
    ],
  }
}

test('the baked fight has five stretches and four changes', () => {
  const lead = leads(file)
  const span = (lead[4]?.from ?? 0) - (lead[1]?.from ?? 0)

  expect(lead.map((l) => file.cars[l.who].code)).toEqual(['LEC', 'RUS', 'LEC', 'RUS', 'LEC'])
  expect(lead[0]?.from).toBe(0)
  expect(lead.at(-1)?.to).toBe(END)
  expect(span).toBeGreaterThan(75)
  expect(span).toBeLessThan(85)
})

test('changes fall where the telemetry puts them', () => {
  const at = leads(file)
    .slice(1)
    .map((l) => l.from)

  for (const [i, t] of [12.92, 46.47, 89.87, 91.93].entries()) expect(Math.abs((at[i] ?? 0) - t)).toBeLessThan(0.3)
})

test('a lead shorter than a second does not count', () => {
  expect(leads(flicker(0.5)).length).toBe(1)
  expect(leads(flicker(1.5)).length).toBe(3)
})

test('steps name who takes the lead and read their speeds from the data', () => {
  expect(all.map((s) => s.title)).toEqual(['Russell dives', 'Leclerc answers', 'Too deep', 'The cut-back'])
  expect(all[0].text).toMatch(/^(29\d|30\d) against 26\d km\/h on the run to Turn 3\. Russell takes the lead\.$/)
  expect(all[1].text).toMatch(/^(31\d|32\d) against 29\d km\/h on the straight to Turn 9\. Leclerc is back in front\.$/)
  expect(all.map((s) => s.text).join(' ')).not.toContain('inside')
})

test('the car behind reads its gap in metres, and Level inside the error', () => {
  const lead = leads(file)

  expect(readout(file, lead, 30).rows[1].gap).toBe('Leader')
  expect(readout(file, lead, 30).rows[0].gap).toMatch(/^\+(1|2)\d m$/)
  expect(readout(file, lead, 90.5).rows[0].gap).toBe('Level')
  expect(readout(file, lead, END).rows[0].gap).toBe('Leader')
  expect(readout(file, lead, END).rows[1].gap).toMatch(/^\+(1|2)\d m$/)
})

test('no dropped sample is kept: throttle stays in range and no car sits flat out on the brake', () => {
  const stuck = (r: PoleRow | undefined) => r !== undefined && r[4] > 90 && r[5] > 0

  for (const car of file.cars)
    for (const [i, r] of car.rows.entries()) {
      expect(r[4] >= 0 && r[4] <= 100).toBe(true)
      expect(stuck(r) && stuck(car.rows[i - 1])).toBe(false)
    }
})

test('the slider says the time, the step and who leads', () => {
  expect(text(0)).toBe('0.0 s, before the first change, Leclerc leads')
  expect(text(92.5)).toBe('92.5 s, step 4 of 4, The cut-back, Leclerc leads')
})

test('the camera opens on the whole circuit, is close at Turn 3 and closest at Turn 1, and never jumps', () => {
  expect(camAt(file, 0)).toMatchObject({ k: 1, w: 0 })
  expect(camAt(file, 12).w).toBe(1)
  expect(camAt(file, 91).k).toBeGreaterThan(camAt(file, 30).k)

  for (let t = 0.05; t <= END; t += 0.05) {
    const a = camAt(file, t - 0.05)
    const b = camAt(file, t)

    expect(Math.abs(b.k - a.k)).toBeLessThan(0.15)
    expect(Math.abs(b.u - a.u)).toBeLessThan(0.002)
  }
})
