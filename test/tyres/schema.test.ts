import { expect, test } from 'bun:test'

import { Schema } from 'effect'

import baked from '#/tyres/miami.json'
import { UndercutFile } from '#/tyres/schema.ts'

test('the baked undercut decodes and has four steps', () => {
  const file = Schema.decodeUnknownSync(UndercutFile)(baked)

  expect(file.early.code).toBe('ANT')
  expect(file.late.code).toBe('NOR')
  expect(file.early.stop.lap).toBe(26)
  expect(file.late.stop.lap).toBe(27)
  expect(file.early.stop.stopS).toBeCloseTo(2.2, 1)
  expect(file.late.stop.stopS).toBeCloseTo(2.8, 1)
  expect(file.early.stop.entry).toBeLessThan(file.early.stop.exit)
  expect(file.early.stop.exit).toBeLessThan(file.late.stop.entry)
  expect(file.pit.points.length).toBeGreaterThanOrEqual(20)
})

test('a truncated file fails to decode', () => {
  expect(() => Schema.decodeUnknownSync(UndercutFile)({ ...baked, late: undefined })).toThrow()
})
