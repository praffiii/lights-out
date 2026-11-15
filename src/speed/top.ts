import type { OpenF1Driver, OpenF1Session } from '../season/openf1-schema.ts'

import type { SpeedLap, SpeedRace } from './schema.ts'

const faster = (a: SpeedLap, b: SpeedLap) => (b.st_speed ?? 0) > (a.st_speed ?? 0) || ((b.st_speed ?? 0) === (a.st_speed ?? 0) && b.lap_number < a.lap_number)

export const fastestLap = (laps: ReadonlyArray<SpeedLap>): SpeedLap | undefined =>
  laps.reduce<SpeedLap | undefined>((best, lap) => (lap.st_speed === null ? best : !best || faster(best, lap) ? lap : best), undefined)

export function raceRow(session: OpenF1Session, laps: ReadonlyArray<SpeedLap>, drivers: ReadonlyArray<OpenF1Driver>): SpeedRace | undefined {
  const best = fastestLap(laps)
  const driver = best && drivers.find((d) => d.driver_number === best.driver_number)

  if (!best || best.st_speed === null || !driver) return undefined

  return { sessionKey: session.session_key, circuit: session.circuit_short_name, dateEnd: session.date_end, kmh: best.st_speed, driverNumber: best.driver_number, surname: driver.last_name, lap: best.lap_number }
}

export const seasonBest = (races: ReadonlyArray<SpeedRace>): SpeedRace | undefined => races.reduce<SpeedRace | undefined>((best, race) => (!best || race.kmh > best.kmh ? race : best), undefined)

export const speedLine = (race: SpeedRace): string => `Car ${race.driverNumber}, ${race.surname}, through the ${race.circuit} speed trap on lap ${race.lap}. Flaps open.`
