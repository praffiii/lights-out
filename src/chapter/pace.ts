const SAME = 1e-6

export type Pace = ReadonlyArray<readonly [progress: number, t: number]>

export const linearPace = (end: number): Pace => [
  [0, 0],
  [1, end],
]

export const stepPace = (stepTimes: ReadonlyArray<number>, end: number): Pace => [[0, 0], ...stepTimes.map((t, i): readonly [number, number] => [(i + 1) / (stepTimes.length + 1), t]), [1, end]]

const across = (pace: Pace, x: number, from: 0 | 1, to: 0 | 1) => {
  const first = pace[0]
  const last = pace.at(-1)

  if (!first || !last) return 0

  if (x <= first[from]) return first[to]

  if (x >= last[from]) return last[to]

  const i = pace.findIndex((k) => k[from] >= x)
  const b = pace[i] ?? last
  const a = pace[i - 1] ?? first

  return b[from] === a[from] ? b[to] : a[to] + ((b[to] - a[to]) * (x - a[from])) / (b[from] - a[from])
}

export const timeAt = (pace: Pace, progress: number) => across(pace, progress, 0, 1)

export const progressAt = (pace: Pace, t: number) => across(pace, t, 1, 0)

export const prevStop = (stops: ReadonlyArray<number>, t: number) => stops.reduce((best, s) => (s < t - SAME && s > best ? s : best), 0)

export const nextStop = (stops: ReadonlyArray<number>, t: number, end: number) => stops.reduce((best, s) => (s > t + SAME && s < best ? s : best), end)
