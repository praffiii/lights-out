import { type Focus, stepAt } from '#/pass/model.ts'
import { sampleRows } from '#/pole/replay.ts'

import type { FightFile } from './schema.ts'

export const END = 96

const HOLD = 1

const LEVEL_M = 5

const OPEN = 1.5

const PUSH = 8

const CHASE = 4.2

const CLOSE = 6

const TIGHT_FROM = 84

const TIGHT = 5

export type Which = 0 | 1

export type Lead = { who: Which; from: number; to: number }

export type Step = { n: 1 | 2 | 3 | 4; t: number; title: string; text: string; mark: string }

export type Row = { speed: number; gear: number; gap: string; cells: number; brake: boolean; u: number }

export type Readout = { leader: Which; rows: readonly [Row, Row] }

const other = (who: Which): Which => (who === 0 ? 1 : 0)

const smooth = (x: number) => {
  const f = Math.min(1, Math.max(0, x))

  return f * f * (3 - 2 * f)
}

export const surname = (name: string) => name.split(' ').at(-1) ?? name

const ahead = (file: FightFile, t: number) => sampleRows(file.cars[1].rows, t).u - sampleRows(file.cars[0].rows, t).u

const raw = (file: FightFile): Lead[] => {
  const inside = file.cars.flatMap((c) => c.rows.map((r) => r[0])).filter((t) => t > 0 && t < END)
  const times = [0, ...new Set(inside), END].sort((a, b) => a - b)
  const out: Lead[] = [{ who: ahead(file, 0) > 0 ? 1 : 0, from: 0, to: END }]

  for (const [i, t] of times.entries()) {
    const before = times[i - 1]
    const last = out.at(-1)

    if (before === undefined || !last) continue

    const a = ahead(file, before)
    const b = ahead(file, t)
    const who: Which = b > 0 ? 1 : 0

    if (who === last.who || a === b) continue

    last.to = before + ((t - before) * a) / (a - b)
    out.push({ who, from: last.to, to: END })
  }

  return out
}

export const leads = (file: FightFile): ReadonlyArray<Lead> => {
  const out: Lead[] = []

  for (const l of raw(file)) {
    const last = out.at(-1)

    if (last && (last.who === l.who || l.to - l.from < HOLD)) last.to = l.to
    else out.push(l)
  }

  return out
}

export const steps = (file: FightFile): readonly [Step, Step, Step, Step] | null => {
  const [, a, b, c, d, ...more] = leads(file)

  if (!a || !b || !c || !d || more.length > 0) return null

  const name = (l: Lead) => surname(file.cars[l.who].name)

  const speeds = (l: Lead) => {
    const at = (who: Which) => Math.round(sampleRows(file.cars[who].rows, l.from).speed)

    return `${at(l.who)} against ${at(other(l.who))} km/h`
  }

  return [
    { n: 1, t: a.from, title: `${name(a)} dives`, text: `${speeds(a)} on the run to Turn 3. ${name(a)} takes the lead.`, mark: 'Dive · Turn 3' },
    { n: 2, t: b.from, title: `${name(b)} answers`, text: `${speeds(b)} on the straight to Turn 9. ${name(b)} is back in front.`, mark: 'Straight to Turn 9' },
    { n: 3, t: c.from, title: 'Too deep', text: `Turn 1, next lap. ${name(c)} dives again, brakes too late and locks up.`, mark: 'Dive · Turn 1 · locks up' },
    { n: 4, t: d.from, title: 'The cut-back', text: `${name(d)} is on the power first, carries more speed off the corner and leads again.`, mark: 'Cut-back' },
  ]
}

export const leaderAt = (all: ReadonlyArray<Lead>, t: number): Which => all.filter((l) => l.from <= t).at(-1)?.who ?? 0

export { stepAt }

export const readout = (file: FightFile, all: ReadonlyArray<Lead>, t: number): Readout => {
  const leader = leaderAt(all, t)
  const metres = Math.abs(ahead(file, t)) * file.lengthM

  const row = (who: Which): Row => {
    const now = sampleRows(file.cars[who].rows, t)
    const behind = metres < LEVEL_M ? 'Level' : `+${Math.round(metres)} m`

    return { speed: Math.round(now.speed), gear: now.gear, gap: who === leader ? 'Leader' : behind, cells: Math.round(now.throttle / 20), brake: now.brake > 0, u: now.u }
  }

  return { leader, rows: [row(0), row(1)] }
}

export const sliderText = (file: FightFile, all: ReadonlyArray<Step>, lead: ReadonlyArray<Lead>, t: number) => {
  const step = all[stepAt(all, t) - 1]
  const who = `${surname(file.cars[leaderAt(lead, t)].name)} leads`

  return step ? `${t.toFixed(1)} s, step ${step.n} of ${all.length}, ${step.title}, ${who}` : `${t.toFixed(1)} s, before the first change, ${who}`
}

export const camAt = (file: FightFile, t: number): Focus => {
  const w = smooth((t - OPEN) / PUSH)
  const k = 1 + (CHASE - 1) * w + (CLOSE - CHASE) * smooth((t - TIGHT_FROM) / TIGHT)

  return { u: (sampleRows(file.cars[0].rows, t).u + sampleRows(file.cars[1].rows, t).u) / 2, k, w }
}
