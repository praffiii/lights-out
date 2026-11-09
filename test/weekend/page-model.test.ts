import { afterAll, beforeAll, expect, it } from 'bun:test'
import { Schema } from 'effect'

import { portraitFor } from '../../src/drivers/portraits.ts'
import type { Race, SessionName } from '../../src/season/jolpica-schema.ts'
import { type LatestSession, type SeasonSnapshot, SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'
import { clockDigits, weekendPage } from '../../src/weekend/page-model.ts'
import { calendar2027Shifted } from '../season/fake-jolpica.ts'
import { snapshotAt } from '../season/snapshot.ts'

const zone = process.env.TZ

beforeAll(() => {
  process.env.TZ = 'UTC'
})

afterAll(() => {
  process.env.TZ = zone
})

const fixture = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot.json').text())

const JAKARTA = 'Asia/Jakarta'

const page = (iso: string, snapshot: SeasonSnapshot = fixture, visitor = JAKARTA) => weekendPage(snapshot, new Date(iso), visitor)

const unconfirm = (snapshot: SeasonSnapshot, round: number, names: ReadonlyArray<SessionName>): SeasonSnapshot => ({
  ...snapshot,
  calendar: snapshot.calendar.map((race): Race =>
    race.round === round ? { ...race, sessions: race.sessions.map((s) => (names.includes(s.name) ? { ...s, timeConfirmed: false } : s)) } : race,
  ),
})

const withLatest = (latestSession: LatestSession): SeasonSnapshot => ({ ...fixture, latestSession })

it('names the visitor day when the session falls on another day for them', () => {
  const vegas = page('2026-11-22T01:00:00Z')

  expect(vegas?.clock).toMatchObject({ label: 'Next · Race', track: 'Sat 21 Nov · 20:00 at the track', yours: 'Sun 11:00 your time' })
  expect(page('2026-11-22T01:00:00Z', fixture, 'America/Los_Angeles')?.clock?.yours).toBe('20:00 your time')
})

it('writes the hero copy two hours before Practice 3', () => {
  const p = page('2026-11-07T12:30:00Z')

  expect(p?.label).toBe('This season · Round 20 of 23')
  expect(p?.title).toBe('São Paulo Grand Prix.')
  expect(p?.dates).toBe('6–8 November 2026 · Autódromo José Carlos Pace')
  expect(p?.flag).toBeNull()
  expect(p?.clock).toEqual({ label: 'Next · Practice 3', target: '2026-11-07T14:30:00.000Z', units: 'hms', track: 'Sat 7 Nov · 11:30 at the track', yours: '21:30 your time' })
  expect(p?.note).toBe("Then qualifying at 15:00 track time: three knockout rounds that set Sunday's grid.")
})

it('counts in hours, minutes and seconds under a day to go', () => {
  const clock = page('2026-11-07T12:30:00Z')?.clock

  if (!clock) throw new Error('the clock is running')

  expect(clockDigits(clock, Date.parse('2026-11-07T12:30:00Z'))).toEqual([
    { value: '02', unit: 'Hours' },
    { value: '00', unit: 'Minutes' },
    { value: '00', unit: 'Seconds' },
  ])
})

it('counts in days, hours and minutes from a day out', () => {
  const clock = page('2026-11-02T10:30:00Z')?.clock

  if (!clock) throw new Error('the clock is running')

  expect(clock.units).toBe('dhm')
  expect(clockDigits(clock, Date.parse('2026-11-02T10:30:00Z'))).toEqual([
    { value: '04', unit: 'Days' },
    { value: '05', unit: 'Hours' },
    { value: '00', unit: 'Minutes' },
  ])
})

it('counts whole days to a session whose time is not confirmed', () => {
  const p = page('2026-11-07T12:30:00Z', unconfirm(fixture, 20, ['FP3']))
  const clock = p?.clock

  if (!clock) throw new Error('the clock is running')

  expect(clock).toMatchObject({ units: 'd', target: '2026-11-08T14:30:00.000Z', track: 'Sat 7 Nov · time TBC', yours: '' })
  expect(clockDigits(clock, Date.parse('2026-11-07T12:30:00Z'))).toEqual([{ value: '01', unit: 'Days' }])
  expect(p?.note).toBe('Session times are not confirmed yet.')
})

it('counts to the end of a live session', () => {
  const p = page('2026-11-07T14:50:00Z')

  expect(p?.clock?.label).toBe('Live · Practice 3')
  expect(p?.clock?.target).toBe('2026-11-07T15:30:00.000Z')
  expect(p?.band.schedule.find((row) => row.label === 'Practice 3')).toEqual({ label: 'Practice 3', day: 'SAT · live', time: '21:30', state: 'live' })
})

it('waves the flag after the race and names the next start in its own track zone', () => {
  const p = page('2026-11-08T20:00:00Z')

  expect(p?.clock).toBeNull()
  expect(p?.flag).toBe('Chequered flag. The Las Vegas Grand Prix starts Sat 21 Nov.')
  expect(p?.note).toBe('')
})

it('says the season is over after the finale', () => {
  expect(page('2026-12-06T16:00:00Z')?.flag).toBe('Chequered flag. That was the last race of 2026.')
})

it('labels a race from next season', () => {
  expect(page('2027-03-01T00:00:00Z', { ...fixture, nextCalendar: calendar2027Shifted.races })?.label).toBe('Next race · 2027 · Round 1')
})

it("tells a Las Vegas visitor that qualifying sets Saturday's grid", () => {
  expect(page('2026-11-20T22:30:00Z')?.note).toBe("Then qualifying at 20:00 track time: three knockout rounds that set Saturday's grid.")
})

it("lists the schedule in the visitor's time", () => {
  const band = page('2026-11-07T12:30:00Z')?.band

  expect(band?.when).toBe('6–8 Nov')
  expect(band?.zone).toBe('GMT+7')
  expect(band?.info?.model).toBe('br-1940')
  expect(band?.facts?.laps).toBe(71)
  expect(band?.schedule).toEqual([
    { label: 'Practice 1', day: 'FRI', time: '22:30', state: 'done' },
    { label: 'Practice 2', day: 'SAT', time: '02:00', state: 'done' },
    { label: 'Practice 3', day: 'SAT · next', time: '21:30', state: 'next' },
    { label: 'Qualifying', day: 'SUN', time: '01:00', state: 'later' },
    { label: 'Race', day: 'MON', time: '00:00', state: 'later' },
  ])
})

it('shows an unconfirmed session on its UTC day without a time', () => {
  const race = page('2026-11-19T00:00:00Z', unconfirm(fixture, 21, ['Race']), 'America/New_York')?.band.schedule.at(-1)

  expect(race).toEqual({ label: 'Race', day: 'SUN', time: 'TBC', state: 'later' })
})

it('writes the latest practice as a headline', async () => {
  const p = page('2026-11-06T21:00:00Z', await snapshotAt('2026-11-06T21:00:00Z'))

  expect(p?.latest).toEqual({
    label: 'Latest · Practice 2 · Fri 6 Nov',
    gap: '0.253 s',
    headline: 'Antonelli fastest. Norris that far behind.',
    body: "Verstappen third, Russell fourth. Practice times hint, they don't decide: teams run different fuel loads and tyres.",
    rows: [
      { position: 1, code: 'ANT', colour: '#27F4D2', time: '1:10.763' },
      { position: 2, code: 'NOR', colour: '#FF8000', time: '+0.253' },
      { position: 3, code: 'VER', colour: '#3671C6', time: '+0.259' },
    ],
    image: portraitFor('ANT'),
    who: 'Kimi Antonelli · Mercedes',
  })
})

it('writes qualifying from each driver’s last lap', async () => {
  const latest = page('2026-11-07T20:00:00Z', await snapshotAt('2026-11-07T20:00:00Z'))?.latest

  expect(latest?.label).toBe('Latest · Qualifying · Sat 7 Nov')
  expect(latest?.headline).toStartWith('Norris on pole.')
  expect(latest?.body).toEndWith('Pole is the best seat into Turn 1, not a promise.')
  expect(latest?.rows[0]?.time).toBe('1:27.470')
  expect(latest?.gap).toMatch(/^\d\.\d{3} s$/)
})

it('names the Grand Prix when the latest session is from another weekend', () => {
  const latest = page('2026-11-06T15:00:00Z')?.latest

  expect(latest?.label).toBe('Latest · Mexico City GP · Race · Sun 1 Nov')
  expect(latest?.headline).toEndWith('that far behind.')
  expect(latest?.headline).toStartWith('Verstappen wins.')
  expect(latest?.rows[0]?.time).toBe('2:20:28.772')
})

const row = (position: number, code: string, gap: number | string, extra: Partial<LatestSession['rows'][number]> = {}) => ({
  position,
  code,
  family: code,
  name: code,
  team: 'Team',
  colour: null,
  time: 90 + position,
  gap,
  ...extra,
})

it('reads a lapped gap in words', () => {
  const latest = page('2026-11-06T21:00:00Z', withLatest({ season: 2026, round: 20, name: 'Race', startsAt: '2026-11-08T17:00:00Z', rows: [row(1, 'ANT', 0), row(2, 'NOR', '+1 LAP')] }))?.latest

  expect(latest?.gap).toBe('1 lap')
  expect(latest?.body).toBe('Points go to the top ten, 25 for the win.')
})

it("uses the row's own names for a driver CARS does not know", () => {
  const latest = page(
    '2026-11-06T21:00:00Z',
    withLatest({
      season: 2026,
      round: 20,
      name: 'FP2',
      startsAt: '2026-11-06T19:00:00Z',
      rows: [row(1, 'XYZ', 0, { family: 'Doe', name: 'Jane Doe', team: 'Nowhere', colour: 'ABCDEF' }), row(2, 'NOR', 0.1)],
    }),
  )?.latest

  expect(latest?.headline).toBe('Doe fastest. Norris that far behind.')
  expect(latest?.who).toBe('Jane Doe · Nowhere')
  expect(latest?.rows[0]?.colour).toBe('#ABCDEF')
  expect(latest?.image).toBeUndefined()
})

it('has no latest block without a latest session', () => {
  const { latestSession: _, ...bare } = fixture

  expect(page('2026-11-06T21:00:00Z', bare)?.latest).toBeNull()
})
