import { sampleRows } from '#/pole/replay.ts'
import type { PoleRow } from '#/pole/schema.ts'

import { MARKS } from './interlagos.ts'
import type { PassFile } from './schema.ts'

type Rows = ReadonlyArray<PoleRow>

export const CAR_M = 5.5

const mix = (a: number, b: number, f: number) => a + (b - a) * f

export const crossTime = (rows: Rows, u: number): number | null => {
  for (const [i, b] of rows.entries()) {
    if (b[1] < u) continue

    const a = rows[i - 1]

    if (!a) return b[1] === u ? b[0] : null

    return b[1] === a[1] ? a[0] : mix(a[0], b[0], (u - a[1]) / (b[1] - a[1]))
  }

  return null
}

export const brakeOnset = (rows: Rows, from: number, to: number): { t: number; u: number } | null => {
  for (const [i, b] of rows.entries()) {
    if (b[1] < from || b[1] > to || b[5] <= 0) continue

    const a = rows[i - 1]

    return a && a[5] <= 0 && a[1] >= from ? { t: mix(a[0], b[0], 0.5), u: mix(a[1], b[1], 0.5) } : { t: b[0], u: b[1] }
  }

  return null
}

export type Step = { n: 1 | 2 | 3 | 4; t: number; title: string; text: string }

export type Readout = { speed: number; gear: number; gap: string; mode: 'Straight' | 'Corner' | 'Overtake'; cells: number; brake: boolean }

export type Focus = { u: number; k: number; w: number }

const UNLOCK = 1

const SAME = 1e-6

const detectionGap = (pass: PassFile) => {
  const c = crossTime(pass.chaser.rows, MARKS.detection)
  const l = crossTime(pass.leader.rows, MARKS.detection)

  return c === null || l === null ? null : c - l
}

const levelAt = (pass: PassFile, from: number) => {
  for (const r of pass.chaser.rows) {
    if (r[0] < from) continue

    if ((sampleRows(pass.leader.rows, r[0]).u - r[1]) * pass.lengthM <= CAR_M) return r[0]
  }

  return null
}

export const steps = (pass: PassFile): readonly [Step, Step, Step, Step] | null => {
  const gap = detectionGap(pass)
  const t1 = crossTime(pass.chaser.rows, MARKS.detection)
  const t2 = crossTime(pass.chaser.rows, MARKS.activation)
  const bc = brakeOnset(pass.chaser.rows, 1, MARKS.apex)
  const bl = brakeOnset(pass.leader.rows, 1, MARKS.apex)

  if (gap === null || gap > UNLOCK || t1 === null || t2 === null || !bc || !bl) return null

  const t3 = levelAt(pass, t2)

  if (t3 === null || t3 > bc.t) return null

  const metres = Math.round(((bc.u - bl.u) * pass.lengthM) / 5) * 5

  return [
    { n: 1, t: t1, title: 'Within one second', text: `${gap.toFixed(1)} s behind at the detection point. That unlocks Overtake Mode for the straight.` },
    { n: 2, t: t2, title: 'Overtake Mode', text: 'Extra electric power, for longer, all the way up the hill.' },
    { n: 3, t: t3, title: 'Out of the tow', text: 'Clean air, nose alongside.' },
    { n: 4, t: bc.t, title: 'Brake later', text: `Inside line for Turn 1, braking about ${metres} metres after the leader.` },
  ]
}

const inZone = (u: number) => MARKS.zones.some(([a, b]) => [u, u - 1, u + 1].some((x) => x >= a && x <= b))

export const readout = (pass: PassFile, t: number) => {
  const c = sampleRows(pass.chaser.rows, t)
  const l = sampleRows(pass.leader.rows, t)
  const gap = detectionGap(pass)
  const chaserBehind = c.u < l.u

  const behindGap = (rows: PassFile['chaser']['rows'], u: number) => {
    const reached = crossTime(rows, u)

    return reached === null ? '—' : `${Math.max(0, t - reached).toFixed(1)} s`
  }

  const read = (now: typeof c, mode: Readout['mode'], gapText: string): Readout => ({
    speed: Math.round(now.speed),
    gear: now.gear,
    gap: gapText,
    mode,
    cells: Math.round(now.throttle / 20),
    brake: now.brake > 0,
  })

  const unlocked = gap !== null && gap <= UNLOCK && c.u >= MARKS.activation && c.u <= MARKS.apex
  const zone = (u: number) => (inZone(u) ? 'Straight' : 'Corner')

  return {
    chaser: read(c, unlocked ? 'Overtake' : zone(c.u), chaserBehind ? behindGap(pass.leader.rows, c.u) : 'Ahead'),
    leader: read(l, zone(l.u), chaserBehind ? 'Ahead' : behindGap(pass.chaser.rows, l.u)),
    u: { chaser: c.u, leader: l.u },
  }
}

export const stepAt = (all: ReadonlyArray<Step>, t: number) => all.filter((s) => t >= s.t - SAME).length

export const prevStep = (all: ReadonlyArray<Step>, t: number) => all.reduce((best, s) => (s.t < t - SAME && s.t > best ? s.t : best), 0)

export const nextStep = (all: ReadonlyArray<Step>, t: number, end: number) => all.reduce((best, s) => (s.t > t + SAME && s.t < best ? s.t : best), end)

export const sliderText = (all: ReadonlyArray<Step>, t: number) => {
  const n = stepAt(all, t)
  const step = all[n - 1]

  return step ? `${t.toFixed(1)} s, step ${n} of ${all.length}, ${step.title}` : `${t.toFixed(1)} s, before the detection point`
}
