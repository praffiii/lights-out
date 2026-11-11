import { Effect } from 'effect'

import type { CircuitInfo } from '#/circuits/registry.ts'
import { OpenF1Client, type OpenF1Error } from '#/season/openf1-client.ts'
import type { OpenF1Session } from '#/season/openf1-schema.ts'

import { alignLap } from './align.ts'
import type { PoleLap } from './schema.ts'

const MATCH = 0.01
const EDGE_MS = 1000
const WET = new Set(['INTERMEDIATE', 'WET'])

export const latestQualifying = (sessions: ReadonlyArray<OpenF1Session>, info: CircuitInfo, now: Date) =>
  sessions
    .filter((s) => s.session_name === 'Qualifying' && s.circuit_short_name === info.openf1 && s.is_cancelled !== true && Date.parse(s.date_end) < now.getTime())
    .reduce<OpenF1Session | null>((best, s) => (best === null || Date.parse(s.date_start) > Date.parse(best.date_start) ? s : best), null)

const iso = (ms: number) => new Date(ms).toISOString()

export const poleLap = (info: CircuitInfo, session: OpenF1Session): Effect.Effect<{ lap: PoleLap } | { skip: string }, OpenF1Error, OpenF1Client> =>
  OpenF1Client.use((client) =>
    Effect.gen(function* () {
      const key = session.session_key
      const pole = (yield* client.poleResult(key)).find((row) => row.position === 1)
      const time = pole?.duration ?? null

      if (!pole || time === null) return { skip: `session ${key} has no pole time yet` }

      const lap = (yield* client.laps(key, pole.driver_number)).find((l) => l.lap_duration !== null && Math.abs(l.lap_duration - time) < MATCH)
      const s1 = lap?.duration_sector_1 ?? null
      const s2 = lap?.duration_sector_2 ?? null
      const s3 = lap?.duration_sector_3 ?? null

      if (!lap?.date_start || s1 === null || s2 === null || s3 === null) return { skip: `session ${key} has no lap matching ${time}` }

      const start = Date.parse(lap.date_start)
      const end = start + time * 1000
      const car = yield* client.carData(key, pole.driver_number, iso(start - EDGE_MS), iso(end + EDGE_MS))
      const location = yield* client.location(key, pole.driver_number, iso(start - EDGE_MS), iso(end + EDGE_MS))
      const aligned = alignLap({ start, time, splits: [s1, s1 + s2], car, location, line: info.line, cuts: info.cuts })

      if (!aligned) return { skip: `session ${key} does not line up with the ${info.id} model` }

      const stints = yield* client.stints(key, pole.driver_number)
      const wet = stints.some((s) => (s.lap_start ?? Infinity) <= lap.lap_number && lap.lap_number <= (s.lap_end ?? -Infinity) && WET.has(s.compound ?? ''))
      const driver = (yield* client.drivers(key)).find((d) => d.driver_number === pole.driver_number)

      if (!driver) return { skip: `session ${key} has no driver ${pole.driver_number}` }

      return {
        lap: {
          sessionKey: key,
          year: new Date(session.date_start).getUTCFullYear(),
          driver: `${driver.first_name} ${driver.last_name}`,
          wet,
          time,
          sectors: [s1, s2, s3],
          rows: aligned.rows,
        },
      }
    }),
  )
