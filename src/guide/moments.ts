import { POINTS } from '#/chapter/content.ts'
import { CHAPTERS, type ChapterPath } from '#/home/content.ts'

import type { RaceFile } from './schema.ts'

export type Moment = { lap: number; n: string; to: ChapterPath; chapter: string; label: string; text: string; above: boolean }

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export const trackDay = (date: string) => DAY.format(new Date(date))

export const at = (lap: number, laps: number) => lap / laps

const moment = (lap: number, n: string, label: string, text: string, above = false): Moment => {
  const chapter = CHAPTERS.find((c) => c.n === n)

  if (!chapter) throw new Error(`no chapter ${n}`)

  return { lap, n, to: chapter.to, chapter: chapter.title, label, text, above }
}

export const moments = (race: RaceFile): ReadonlyArray<Moment> => [
  moment(0, '01', 'The grid', `${race.first} starts first`),
  moment(race.pass.lap, '02', `Lap ${race.pass.lap} · Lead change`, `${race.pass.by} passes ${race.pass.on}`, true),
  moment(race.penalty.lap, '07', `Lap ${race.penalty.lap} · Off track`, `${race.penalty.driver} gets ${race.penalty.seconds} s`),
  moment(race.safetyCar, '04', `Lap ${race.safetyCar} · Safety car`, 'Everyone slows down', true),
  moment(race.safetyCar, '03', `Lap ${race.safetyCar} · Pit stops`, `${race.stops} cars stop`),
  moment(race.overtake, '06', `Lap ${race.overtake} · Overtake Mode`, 'Back on after the safety car'),
  moment(race.trap.lap, '05', `Lap ${race.trap.lap} · ${race.trap.kmh} km/h`, `${race.trap.driver}, fastest at the speed trap`),
  moment(race.laps, '08', `Lap ${race.laps} · Chequered flag`, `${race.winner} wins ${POINTS[0]} points`, true),
]
