import type { TurnLap } from '#/circuits/registry.ts'
import { wrap } from '#/pole/replay.ts'
import type { PoleLap, PoleRow } from '#/pole/schema.ts'

export type Zone = { turn: number; start: number; seconds: number; metres: number; entry: number; min: number }

export type Braking = {
  zones: ReadonlyArray<Zone>
  biggest: Zone
  brakingSeconds: number
  flatSeconds: number
  flatShare: number
  longestRun: { seconds: number; from: number; to: number }
}

const JOIN_S = 0.5
const MIN_S = 0.3
const FLAT = 99

type Run = { first: number; last: number }

const endOf = (rows: ReadonlyArray<PoleRow>, run: Run, time: number) => rows[run.last + 1]?.[0] ?? time

const startOf = (rows: ReadonlyArray<PoleRow>, run: Run) => rows[run.first]?.[0] ?? 0

const runs = (rows: ReadonlyArray<PoleRow>) =>
  rows.reduce<Run[]>((out, row, i) => {
    if (row[5] <= 0) return out

    const open = out.at(-1)

    if (open && open.last === i - 1) open.last = i
    else out.push({ first: i, last: i })

    return out
  }, [])

const joined = (rows: ReadonlyArray<PoleRow>, time: number) =>
  runs(rows)
    .reduce<Run[]>((out, run) => {
      const open = out.at(-1)

      if (open && startOf(rows, run) - endOf(rows, open, time) < JOIN_S) open.last = run.last
      else out.push({ ...run })

      return out
    }, [])
    .filter((run) => endOf(rows, run, time) - startOf(rows, run) >= MIN_S)

const turnAt = (u: number, laps: ReadonlyArray<TurnLap>) => (laps.find((t) => t.u >= wrap(u)) ?? laps[0])?.turn ?? 0

const lowest = (rows: ReadonlyArray<PoleRow>, from: number) => {
  let i = from

  while ((rows[i + 1]?.[2] ?? Infinity) <= (rows[i]?.[2] ?? -Infinity)) i++

  return rows[i]?.[2] ?? 0
}

const metres = (rows: ReadonlyArray<PoleRow>, run: Run, time: number) => {
  let sum = 0

  for (let i = run.first; i <= run.last; i++) {
    const row = rows[i]

    if (row) sum += (row[2] / 3.6) * ((rows[i + 1]?.[0] ?? time) - row[0])
  }

  return Math.round(sum / 10) * 10
}

const zoneOf = (rows: ReadonlyArray<PoleRow>, run: Run, time: number, laps: ReadonlyArray<TurnLap>): Zone => {
  const first = rows[run.first]
  const start = startOf(rows, run)

  return {
    turn: turnAt(first?.[1] ?? 0, laps),
    start,
    seconds: endOf(rows, run, time) - start,
    metres: metres(rows, run, time),
    entry: first?.[2] ?? 0,
    min: lowest(rows, run.first),
  }
}

export const payoff = (b: Braking) => `${Math.round(b.brakingSeconds)} seconds a lap on the brakes, ${Math.round(Number(b.flatSeconds.toFixed(1)))} flat out.`

export const braking = (lap: PoleLap, laps: ReadonlyArray<TurnLap>): Braking | null => {
  const { rows, time } = lap
  const found = joined(rows, time)
  const zones = found.map((run) => zoneOf(rows, run, time, laps))
  const [head] = zones

  if (!head) return null

  const biggest = zones.reduce((best, z) => (z.entry - z.min > best.entry - best.min ? z : best), head)

  const flatSeconds = rows.reduce((sum, row, i) => (row[4] >= FLAT ? sum + ((rows[i + 1]?.[0] ?? time) - row[0]) : sum), 0)

  const longestRun = zones.reduce(
    (best, zone, i) => {
      const next = zones[(i + 1) % zones.length] ?? zone
      const gap = (((next.start - (zone.start + zone.seconds)) % time) + time) % time

      return gap > best.seconds ? { seconds: gap, from: zone.turn, to: next.turn } : best
    },
    { seconds: -1, from: 0, to: 0 },
  )

  return {
    zones,
    biggest,
    brakingSeconds: zones.reduce((sum, z) => sum + z.seconds, 0),
    flatSeconds,
    flatShare: flatSeconds / time,
    longestRun,
  }
}
