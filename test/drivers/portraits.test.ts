import { expect, it } from 'bun:test'

import { PORTRAITS, portraitFor } from '../../src/drivers/portraits.ts'

const LICENCE = /· (CC BY(-SA)? \d\.\d|CC0|Public domain)$/

const portraits = Object.values(PORTRAITS).filter((portrait) => portrait !== undefined)

it('every listed portrait has a file', async () => {
  const exists = await Promise.all(portraits.map(async ({ src }) => [src, await Bun.file(`public${src}`).exists()] as const))

  expect(exists.filter(([, found]) => !found).map(([src]) => src)).toEqual([])
})

it('ANT, VER, RUS, HAM, LEC, NOR and PIA have portraits', () => {
  const missing = ['ANT', 'VER', 'RUS', 'HAM', 'LEC', 'NOR', 'PIA'].filter((code) => !portraitFor(code))

  expect(missing).toEqual([])
  expect(portraitFor(null)).toBeUndefined()
})

it('every credit names a licence', () => {
  expect(portraits.map(({ credit }) => credit).filter((credit) => !LICENCE.test(credit))).toEqual([])
})
