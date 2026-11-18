import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { SeasonSnapshot, SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'
import { snapshot } from './fixture.ts'

it('stores each race row and qualifying place as a tuple and reads them back unchanged', () => {
  const stored = Schema.encodeSync(SeasonSnapshot)(snapshot)

  expect(stored.people?.results.ocon?.[0]).toEqual([1, 13, 11, '11', 0, 'haas'])
  expect(stored.people?.qualifying[0]?.rows[0]).toEqual(['russell', 'mercedes', 1])
  expect(Schema.decodeUnknownSync(SeasonSnapshot)(stored)).toEqual(snapshot)
})

it('keeps the stored snapshot under 100 KB', () => {
  expect(Schema.encodeSync(SeasonSnapshotJson)(snapshot).length).toBeLessThan(100_000)
})
