import { sampleAt } from '#/pole/replay.ts'
import type { PoleLap } from '#/pole/schema.ts'

export type Phase = 'push' | 'fade' | 'brake' | 'part'

export const PART_IDS = ['v6', 'turbo', 'mguK', 'energyStore', 'electronics'] as const

export type PartId = (typeof PART_IDS)[number]

export type PhaseState = {
  lit: PartId
  states: Record<PartId, string>
  mguK: { word: string; note: string }
  battery: string
  sentence: string
}

export const STATES: Record<Phase, PhaseState> = {
  push: {
    lit: 'v6',
    states: { v6: 'Pushing', turbo: 'Spinning', mguK: 'Pushing', energyStore: 'Draining · est.', electronics: 'Deploying' },
    mguK: { word: '↑ Pushing', note: 'Up to 350 kW on top of the V6' },
    battery: 'Draining',
    sentence: 'Flat out. Fuel and battery push together.',
  },
  fade: {
    lit: 'v6',
    states: { v6: 'Pushing', turbo: 'Spinning', mguK: 'Fading', energyStore: 'Low · est.', electronics: 'Rationing' },
    mguK: { word: '↓ Fading', note: 'The electric push runs out' },
    battery: 'Low',
    sentence: 'Flat out in {gear}. The only push left before the brakes.',
  },
  brake: {
    lit: 'mguK',
    states: { v6: 'Off throttle', turbo: 'Slowing', mguK: 'Harvesting', energyStore: 'Charging · est.', electronics: 'Recovering' },
    mguK: { word: '↺ Harvesting', note: 'Braking charges the battery' },
    battery: 'Charging',
    sentence: 'Braking. The motor turns into a generator and charges the battery.',
  },
  part: {
    lit: 'v6',
    states: { v6: 'Part throttle', turbo: 'Spinning', mguK: 'Waiting', energyStore: 'Holding · est.', electronics: 'Balancing' },
    mguK: { word: '– Waiting', note: 'Waiting for full throttle' },
    battery: 'Holding',
    sentence: 'Feeding the power in through the corner.',
  },
}

const FULL_THROTTLE = 90
const FADE_DROP = 3
const HOLD = 0.3
const STEP = 0.1
const DRAIN = 0.05
const CHARGE = 0.22
const MIN_BATTERY = 0.05
const MAX_BATTERY = 1
const START_BATTERY = 0.5
const NUM = new Intl.NumberFormat('en-GB')
const GEARS = ['neutral', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'] as const

const roundUs = (t: number) => Math.round(t * 1e6) / 1e6

const clampTime = (lap: PoleLap, t: number) => Math.min(lap.time, Math.max(0, t))

const rowIndexAtOrBefore = (lap: PoleLap, t: number) => {
  let lo = 0
  let hi = lap.rows.length - 1
  let best = -1

  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const row = lap.rows[mid]

    if (row && row[0] <= t) {
      best = mid
      lo = mid + 1
    } else hi = mid - 1
  }

  return best
}

export const runPeak = (lap: PoleLap, t: number): number => {
  const at = clampTime(lap, t)
  const sample = sampleAt(lap, at)
  let peak = sample.speed
  const last = rowIndexAtOrBefore(lap, at)

  for (let i = last; i >= 0; i--) {
    const row = lap.rows[i]

    if (!row) continue

    if (row[4] < FULL_THROTTLE) break

    if (row[2] > peak) peak = row[2]
  }

  return peak
}

export const rawPhase = (lap: PoleLap, t: number): Phase => {
  const at = clampTime(lap, t)
  const sample = sampleAt(lap, at)

  if (sample.brake > 0) return 'brake'

  if (sample.throttle >= FULL_THROTTLE && sample.speed <= runPeak(lap, at) - FADE_DROP) return 'fade'

  if (sample.throttle >= FULL_THROTTLE) return 'push'

  return 'part'
}

const rowPhaseCache = new WeakMap<PoleLap, ReadonlyArray<Phase>>()

const rowPhases = (lap: PoleLap): ReadonlyArray<Phase> => {
  const cached = rowPhaseCache.get(lap)

  if (cached) return cached

  const out: Phase[] = []
  let peak = 0

  for (const row of lap.rows) {
    const speed = row[2]
    const throttle = row[4]
    const brake = row[5]

    if (throttle < FULL_THROTTLE) peak = 0
    else if (speed > peak) peak = speed

    if (brake > 0) out.push('brake')
    else if (throttle >= FULL_THROTTLE && speed <= peak - FADE_DROP) out.push('fade')
    else if (throttle >= FULL_THROTTLE) out.push('push')
    else out.push('part')
  }

  rowPhaseCache.set(lap, out)

  return out
}

const holdsAt = (lap: PoleLap, phases: ReadonlyArray<Phase>, t: number, phase: Phase) => {
  if (t < HOLD - 1e-6) return false

  const from = roundUs(Math.max(0, t - HOLD))

  if (rawPhase(lap, from) !== phase) return false

  const last = rowIndexAtOrBefore(lap, t)

  for (let i = last; i >= 0; i--) {
    const row = lap.rows[i]

    if (!row || row[0] < from - 1e-6) break

    if (phases[i] !== phase) return false
  }

  return true
}

export const phaseAt = (lap: PoleLap, t: number): Phase => {
  const at = clampTime(lap, t)
  const phases = rowPhases(lap)
  const now = rawPhase(lap, at)

  if (holdsAt(lap, phases, at, now)) return now

  const last = rowIndexAtOrBefore(lap, at)

  for (let i = last; i >= 0; i--) {
    const row = lap.rows[i]
    const phase = phases[i]

    if (row && phase && holdsAt(lap, phases, row[0], phase)) return phase
  }

  return rawPhase(lap, 0)
}

export type FirstFrame = { t: number; headline: 'Flat out, and slowing.' | 'Flat out.' }

export const firstFrame = (lap: PoleLap): FirstFrame => {
  for (const row of lap.rows) {
    if (phaseAt(lap, row[0]) === 'fade') return { t: row[0], headline: 'Flat out, and slowing.' }
  }

  for (const row of lap.rows) {
    if (phaseAt(lap, row[0]) === 'push') return { t: row[0], headline: 'Flat out.' }
  }

  return { t: 0, headline: 'Flat out.' }
}

export const gearWord = (n: number): string => GEARS[Math.round(n)] ?? String(Math.round(n))

export type Readouts = { speed: string; peak: string; rpm: string; gear: string; phase: Phase }

export const readouts = (lap: PoleLap, t: number): Readouts => {
  const at = clampTime(lap, t)
  const sample = sampleAt(lap, at)
  const peak = Math.round(runPeak(lap, at))
  const throttle = Math.round(sample.throttle)

  return {
    speed: `${NUM.format(Math.round(sample.speed))} km/h`,
    peak: `Peak ${NUM.format(peak)} · throttle ${throttle}%`,
    rpm: sample.rpm === null ? '' : `${NUM.format(Math.round(sample.rpm))} rpm`,
    gear: `Gear ${Math.round(sample.gear)} · limit 15,000`,
    phase: phaseAt(lap, at),
  }
}

const batteryCache = new WeakMap<PoleLap, ReadonlyArray<number>>()

const batterySteps = (lap: PoleLap): ReadonlyArray<number> => {
  const cached = batteryCache.get(lap)

  if (cached) return cached

  const count = Math.ceil(lap.time / STEP)
  const levels: number[] = [START_BATTERY]
  let level = START_BATTERY

  for (let i = 1; i <= count; i++) {
    const t = Math.min(lap.time, i * STEP)
    const dt = t - (i - 1) * STEP
    const phase = phaseAt(lap, t)

    if (phase === 'push' || phase === 'fade') level -= DRAIN * dt
    else if (phase === 'brake') level += CHARGE * dt

    level = Math.min(MAX_BATTERY, Math.max(MIN_BATTERY, level))
    levels.push(level)
  }

  batteryCache.set(lap, levels)

  return levels
}

export const batteryAt = (lap: PoleLap, t: number): number => {
  const at = clampTime(lap, t)
  const levels = batterySteps(lap)
  const pos = at / STEP
  const i = Math.min(levels.length - 1, Math.floor(pos))
  const j = Math.min(levels.length - 1, i + 1)
  const f = pos - i
  const a = levels[i] ?? START_BATTERY
  const b = levels[j] ?? a

  return a + (b - a) * f
}
