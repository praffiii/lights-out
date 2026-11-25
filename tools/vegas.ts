import { writeFileSync } from 'node:fs'

import { Schema } from 'effect'

import { firstOnGrid, firstPass, offTrack, overtakeBack, safetyCarLap, stopsOn, trackDate, trapBest } from '../src/guide/facts.ts'
import type { RaceFile } from '../src/guide/schema.ts'

const SESSION = 11420
const SPACING_MS = 1200

const arg = (name: string) => {
  const i = process.argv.indexOf(name)

  return i >= 0 ? process.argv[i + 1] : undefined
}

const read = async <S extends Schema.Decoder<unknown>>(path: string, row: S): Promise<ReadonlyArray<S['Type']>> => {
  await new Promise((done) => setTimeout(done, SPACING_MS))

  const response = await fetch(`https://api.openf1.org/v1/${path}?session_key=${SESSION}`)

  if (!response.ok) throw new Error(`${path} answered ${response.status}`)

  return Schema.decodeUnknownSync(Schema.Array(row))(await response.json())
}

const need = <A>(value: A | null | undefined, name: string): A => {
  if (value === null || value === undefined) throw new Error(`no ${name}`)

  return value
}

const { Number: Num, String: Str, NullOr, Struct } = Schema

const [session] = await read('sessions', Struct({ date_start: Str, gmt_offset: Str, circuit_short_name: Str }))
const drivers = await read('drivers', Struct({ driver_number: Num, last_name: Str }))
const result = await read('session_result', Struct({ position: NullOr(Num), driver_number: Num, number_of_laps: NullOr(Num) }))
const laps = await read('laps', Struct({ driver_number: Num, lap_number: Num, date_start: NullOr(Str), st_speed: NullOr(Num) }))
const control = await read('race_control', Struct({ date: Str, lap_number: NullOr(Num), message: Str }))
const pits = await read('pit', Struct({ driver_number: Num, lap_number: Num }))
const stints = await read('stints', Struct({ driver_number: Num, lap_start: Num, lap_end: Num }))
const passes = await read('overtakes', Struct({ date: Str, overtaking_driver_number: Num, overtaken_driver_number: Num, position: Num }))
const positions = await read('position', Struct({ date: Str, driver_number: Num, position: Num }))

const who = (n: number) => need(drivers.find((d) => d.driver_number === n)?.last_name, `driver ${n}`)

const meeting = need(session, 'session')

const winner = need(
  result.find((r) => r.position === 1),
  'winner',
)

const pass = need(firstPass(passes, laps), 'pass for the lead')
const penalty = need(offTrack(control), 'penalty')
const safetyCar = need(safetyCarLap(control), 'safety car')
const trap = need(trapBest(laps), 'speed trap')
const stops = stopsOn(safetyCar, pits, stints)

if (stops === 0) throw new Error('no stops under the safety car')

const file: RaceFile = {
  session: SESSION,
  race: meeting.circuit_short_name,
  date: trackDate(meeting.date_start, meeting.gmt_offset),
  laps: need(winner.number_of_laps, 'race length'),
  winner: who(winner.driver_number),
  first: who(need(firstOnGrid(positions), 'grid')),
  pass: { by: who(pass.by), on: who(pass.on), lap: pass.lap },
  penalty: { driver: who(penalty.driver), lap: penalty.lap, seconds: penalty.seconds },
  safetyCar,
  stops,
  overtake: need(overtakeBack(control, safetyCar), 'Overtake Mode'),
  trap: { driver: who(trap.driver), lap: trap.lap, kmh: trap.kmh },
}

const out = arg('--out')
const text = `${JSON.stringify(file, null, 2)}\n`

if (out) writeFileSync(out, text)
else process.stdout.write(text)
