import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { PEOPLE } from '../../src/people/people.ts'
import { People, type PersonRow } from '../../src/people/schema.ts'
import { SeasonSnapshot } from '../../src/season/snapshot-schema.ts'
import { snapshot } from './fixture.ts'

it('stores each race row as a tuple and reads it back unchanged', () => {
  const stored = Schema.encodeSync(SeasonSnapshot)(snapshot)

  expect(stored.people?.results.ocon?.[0]).toEqual([1, 13, 11, '11', 0, 'haas', 13])
  expect(Schema.decodeUnknownSync(SeasonSnapshot)(stored)).toEqual(snapshot)
})

it('keeps people under 40 KB at 24 rounds with a career for every page driver', () => {
  const people = snapshot.people
  const longest = Object.values(people?.past ?? {}).sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0]

  if (!people || !longest) throw new Error('the fixture has no people')

  const extra = (rows: ReadonlyArray<PersonRow>) => rows.slice(-4).map((row, i) => ({ ...row, round: 21 + i }))

  const worst: People = {
    ...people,
    rounds: [...people.rounds, ...people.rounds.slice(-4).map((round, i) => ({ ...round, round: 21 + i }))],
    results: Object.fromEntries(Object.entries(people.results).map(([driverId, rows]) => [driverId, [...rows, ...extra(rows)]])),
    past: Object.fromEntries(PEOPLE.map(({ driverId }) => [driverId, people.past[driverId] ?? longest])),
  }

  expect(JSON.stringify(Schema.encodeSync(People)(worst)).length).toBeLessThan(40_000)
})
