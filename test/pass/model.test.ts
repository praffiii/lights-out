import { describe, expect, test } from 'bun:test'

import { Schema } from 'effect'

import baked from '#/pass/pass.json'
import { brakeOnset, crossTime, focusAt, nextStep, prevStep, readout, sliderText, stepAt, steps } from '#/pass/model.ts'
import { PassFile } from '#/pass/schema.ts'
import type { PoleRow } from '#/pole/schema.ts'

const row = (t: number, u: number, brake = 0, throttle = brake > 0 ? 0 : 100): PoleRow => [t, u, 300, 8, throttle, brake]

const pass = Schema.decodeUnknownSync(PassFile)(baked)

const all = (() => {
  const s = steps(pass)

  if (!s) throw new Error('the baked pass has no steps')

  return s
})()

const end = pass.chaser.rows.at(-1)?.[0] ?? 0

const synthetic = (gap: number): PassFile => {
  const t = [0, 1, 2, 3, 4, 5, 6]

  return {
    ...pass,
    lengthM: 4000,
    chaser: { ...pass.chaser, rows: t.map((x) => row(x, 0.75 + x * 0.06 - gap * 0.06, x >= 5 ? 100 : 0)) },
    leader: { ...pass.leader, rows: t.map((x) => row(x, 0.75 + x * 0.06, x >= 4.5 ? 100 : 0)) },
  }
}

describe('crossTime', () => {
  test('crossTime interpolates between samples', () => {
    const rows = [row(0, 0.5), row(1, 0.6)]

    expect(crossTime(rows, 0.55)).toBeCloseTo(0.5, 9)
    expect(crossTime(rows, 0.7)).toBeNull()
  })
})

describe('brakeOnset', () => {
  test('brakeOnset takes the midpoint of the first brake-on row', () => {
    const rows = [row(0.8, 1.04), row(1, 1.05), row(1.27, 1.06, 100), row(1.5, 1.065, 100)]
    const onset = brakeOnset(rows, 1, 1.075)

    expect(onset?.t).toBeCloseTo(1.135, 9)
    expect(onset?.u).toBeCloseTo(1.055, 9)
  })

  test('is null when the brake never comes on in range', () => {
    expect(brakeOnset([row(0, 1.01), row(1, 1.02)], 1, 1.075)).toBeNull()
  })
})

describe('steps', () => {
  test('the baked pass decodes and every step exists', () => {
    expect(all.map((s) => s.n)).toEqual([1, 2, 3, 4])
  })

  test('steps run in order', () => {
    const [a, b, c, d] = all

    expect(a.t).toBeLessThan(b.t)
    expect(b.t).toBeLessThan(c.t)
    expect(c.t).toBeLessThan(d.t)
  })

  test('step 1 copy carries the detection gap to 0.1 s', () => {
    expect(all[0].title).toBe('Within one second')
    expect(all[0].text).toBe('0.3 s behind at the detection point. That unlocks Overtake Mode for the straight.')
  })

  test('steps 2 and 3 keep the mock copy', () => {
    expect([all[1].title, all[1].text]).toEqual(['Overtake Mode', 'Extra electric power, for longer, all the way up the hill.'])
    expect([all[2].title, all[2].text]).toEqual(['Out of the tow', 'Clean air, nose alongside.'])
  })

  test('step 4 rounds the brake gap to 5 m', () => {
    expect(all[3].title).toBe('Brake later')
    expect(all[3].text).toMatch(/^Inside line for Turn 1, braking about (\d+) metres after the leader\.$/)
    expect(Number(all[3].text.match(/about (\d+)/)?.[1]) % 5).toBe(0)
  })
})

describe('readout', () => {
  test('the gap shows on the car behind and flips at the pass', () => {
    const before = readout(pass, all[0].t)

    expect(before.leader.gap).toBe('Ahead')
    expect(before.chaser.gap).toBe('0.3 s')

    const after = readout(pass, end)

    expect(after.chaser.gap).toBe('Ahead')
    expect(after.leader.gap).toMatch(/^\d+\.\d s$/)
  })

  test('mode follows the zones and the chaser gets Overtake after activation', () => {
    expect(readout(pass, all[0].t).chaser.mode).toBe('Corner')
    expect(readout(pass, all[1].t + 0.5).chaser.mode).toBe('Overtake')
    expect(readout(pass, all[1].t + 0.5).leader.mode).toBe('Corner')
    expect(readout(pass, all[2].t).leader.mode).toBe('Straight')
  })

  test('no Overtake when the detection gap is over one second', () => {
    const far = synthetic(1.5)
    const s = steps(far)

    expect(readout(far, 3).chaser.mode).not.toBe('Overtake')
    expect(s).toBeNull()
  })

  test('throttle fills five cells and the brake shows', () => {
    const at = (throttle: number, brake: number): PassFile => ({ ...pass, chaser: { ...pass.chaser, rows: [row(0, 0.8, brake, throttle), row(1, 0.81, brake, throttle)] } })

    expect([0, 50, 100].map((x) => readout(at(x, 0), 0.5).chaser.cells)).toEqual([0, 3, 5])
    expect(readout(at(0, 100), 0.5).chaser.brake).toBe(true)
    expect(readout(at(100, 0), 0.5).chaser.brake).toBe(false)
  })
})

describe('stepping', () => {
  test('stepAt counts the steps reached', () => {
    expect(stepAt(all, 0)).toBe(0)
    expect(stepAt(all, all[1].t)).toBe(2)
    expect(stepAt(all, end)).toBe(4)
  })

  test('prevStep and nextStep move between steps', () => {
    const t = all[1].t + 0.2

    expect(prevStep(all, t)).toBeCloseTo(all[1].t, 9)
    expect(nextStep(all, t, end)).toBeCloseTo(all[2].t, 9)
    expect(prevStep(all, 0)).toBe(0)
    expect(nextStep(all, 0, end)).toBeCloseTo(all[0].t, 9)
    expect(prevStep(all, end)).toBeCloseTo(all[3].t, 9)
    expect(nextStep(all, end, end)).toBe(end)
  })

  test('sliderText names the step', () => {
    expect(sliderText(all, all[2].t)).toBe(`${all[2].t.toFixed(1)} s, step 3 of 4, Out of the tow`)
    expect(sliderText(all, 0)).toBe('0.0 s, before the detection point')
  })
})

describe('focusAt', () => {
  test('the camera pushes in slowly through the steps', () => {
    expect(focusAt(pass, all, 0)).toMatchObject({ k: 1, w: 0 })
    expect(focusAt(pass, all, all[0].t).k).toBeGreaterThan(1)
    expect(focusAt(pass, all, all[0].t).k).toBeLessThan(2.6)
    expect(focusAt(pass, all, all[1].t).k).toBeCloseTo(2.6, 9)
    expect(focusAt(pass, all, all[3].t)).toMatchObject({ k: 3.4, w: 1 })
    expect(focusAt(pass, all, end).k).toBe(3.4)

    let last = 1

    for (let t = 0; t <= end; t += 0.1) {
      const f = focusAt(pass, all, t)
      const now = readout(pass, t)

      expect(f.k).toBeGreaterThanOrEqual(last)
      expect(f.k - last).toBeLessThan(0.15)
      expect(f.u).toBeGreaterThanOrEqual(Math.min(now.u.chaser, now.u.leader) - 1e-9)
      expect(f.u).toBeLessThanOrEqual(Math.max(now.u.chaser, now.u.leader) + 1e-9)
      last = f.k
    }
  })
})
