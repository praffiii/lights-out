export type Side = { number: number; team: string; pitted: boolean; slicks: boolean }

export type Candidate = {
  lap: number
  position: number
  chaser: Side
  leader: Side
  gapAtDetection: number | null
  intervalNear: number | null
  levelT: number | null
  brakeT: { chaser: number; leader: number } | null
  brakeGapM: number | null
  aligned: boolean
}

const LAP_MIN = 2

const GAP_MAX = 0.9

const INTERVAL_TOLERANCE = 0.3

const BRAKE_MIN_M = 15

const EPSILON = 1e-9

export const reject = (c: Candidate): string | null => {
  if (c.lap < LAP_MIN) return `lap ${c.lap} is before lap ${LAP_MIN}`

  if (c.chaser.pitted || c.leader.pitted) return 'a car pitted on this lap or the one before'

  if (!c.chaser.slicks || !c.leader.slicks) return 'a car is not on slicks'

  if (c.chaser.team === c.leader.team) return `team-mates at ${c.chaser.team}`

  if (c.gapAtDetection === null || c.gapAtDetection > GAP_MAX + EPSILON) return `gap at detection ${c.gapAtDetection?.toFixed(2) ?? 'unknown'} s is over ${GAP_MAX} s`

  if (c.intervalNear === null || Math.abs(c.intervalNear - c.gapAtDetection) > INTERVAL_TOLERANCE + EPSILON) return `intervals ${c.intervalNear?.toFixed(2) ?? 'missing'} s disagree with the measured gap`

  if (c.brakeT === null || c.brakeGapM === null) return 'no brake point for Turn 1'

  if (c.levelT === null || c.levelT > c.brakeT.chaser) return 'the chaser draws level only after braking'

  if (c.brakeGapM < BRAKE_MIN_M - EPSILON) return `brakes only ${c.brakeGapM.toFixed(1)} m later`

  if (!c.aligned) return 'a lap does not align to the model'

  return null
}

export const best = (cs: ReadonlyArray<Candidate>): Candidate | null =>
  cs.filter((c) => reject(c) === null).reduce<Candidate | null>((top, c) => (top === null || c.position < top.position ? c : top), null)
