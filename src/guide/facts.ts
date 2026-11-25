export type Control = { date: string; lap_number: number | null; message: string }

export type Pit = { driver_number: number; lap_number: number }

export type Stint = { driver_number: number; lap_start: number; lap_end: number }

export type Overtake = { date: string; overtaking_driver_number: number; overtaken_driver_number: number; position: number }

export type Lap = { driver_number: number; lap_number: number; date_start: string | null; st_speed: number | null }

export type Position = { date: string; driver_number: number; position: number }

const NEAR_MS = 60_000
const GAIN = 'LEAVING THE TRACK AND GAINING AN ADVANTAGE'

const byDate = (a: { date: string }, b: { date: string }) => Date.parse(a.date) - Date.parse(b.date)

const gap = (a: Control, b: Control) => Math.abs(Date.parse(a.date) - Date.parse(b.date))

export function trackDate(startIso: string, gmtOffset: string) {
  const [h = 0, m = 0] = gmtOffset.replace(/^[+-]/, '').split(':').map(Number)
  const sign = gmtOffset.startsWith('-') ? -1 : 1

  return new Date(Date.parse(startIso) + sign * (h * 60 + m) * 60_000).toISOString().slice(0, 10)
}

export function firstOnGrid(rows: ReadonlyArray<Position>) {
  const seen = new Map<number, number>()

  for (const r of rows.slice().sort(byDate)) if (!seen.has(r.driver_number)) seen.set(r.driver_number, r.position)

  return [...seen].find(([, position]) => position === 1)?.[0] ?? null
}

export const lapAt = (laps: ReadonlyArray<Lap>, iso: string) =>
  laps.reduce((top, l) => (l.date_start !== null && Date.parse(l.date_start) <= Date.parse(iso) ? Math.max(top, l.lap_number) : top), 0)

export function firstPass(passes: ReadonlyArray<Overtake>, laps: ReadonlyArray<Lap>) {
  for (const p of passes.slice().sort(byDate)) {
    const lap = lapAt(laps, p.date)

    if (p.position === 1 && lap > 1) return { by: p.overtaking_driver_number, on: p.overtaken_driver_number, lap }
  }

  return null
}

export function offTrack(rows: ReadonlyArray<Control>) {
  for (const r of rows) {
    const given = new RegExp(`^FIA STEWARDS: (\\d+) SECOND TIME PENALTY FOR CAR (\\d+) .*${GAIN}`).exec(r.message)

    if (!given) continue

    const driver = Number(given[2])
    const noted = rows.find((n) => n.message.includes('NOTED') && n.message.includes(GAIN) && n.message.includes(` ${driver} (`))

    if (!noted) continue

    const [deleted] = rows.filter((d) => d.message.startsWith(`CAR ${driver} `) && d.message.includes('TRACK LIMITS') && gap(d, noted) <= NEAR_MS).sort((a, b) => gap(a, noted) - gap(b, noted))
    const lap = deleted ? / LAP (\d+) /.exec(deleted.message)?.[1] : undefined

    if (lap) return { driver, lap: Number(lap), seconds: Number(given[1]) }
  }

  return null
}

export const safetyCarLap = (rows: ReadonlyArray<Control>) => rows.find((r) => r.message === 'SAFETY CAR DEPLOYED')?.lap_number ?? null

export const stopsOn = (lap: number, pits: ReadonlyArray<Pit>, stints: ReadonlyArray<Stint>) =>
  [...new Set(pits.flatMap((p) => (p.lap_number === lap ? [p.driver_number] : [])))].filter(
    (d) => stints.some((s) => s.driver_number === d && s.lap_end === lap) && stints.some((s) => s.driver_number === d && s.lap_start === lap + 1),
  ).length

export const overtakeBack = (rows: ReadonlyArray<Control>, after: number) =>
  rows.find((r) => r.message === 'OVERTAKE ENABLED' && r.lap_number !== null && r.lap_number > after)?.lap_number ?? null

export function trapBest(laps: ReadonlyArray<Lap>) {
  let best: { driver: number; lap: number; kmh: number } | null = null

  for (const l of laps) if (l.st_speed !== null && l.st_speed > (best?.kmh ?? 0)) best = { driver: l.driver_number, lap: l.lap_number, kmh: l.st_speed }

  return best
}
