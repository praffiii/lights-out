import { expect, it } from 'bun:test'

import { COUNTS, creditParts, CREDITS } from '../../src/credits/photos.ts'

it('reads the photographer and licence out of every credit line on the site', () => {
  for (const credit of CREDITS) {
    expect(credit.by).not.toBe('')
    expect(credit.licence).toMatch(/^(CC0|CC BY(-SA)? \d\.\d|Public domain)$/)
  }
})

it('reads a credit line with a caption before the photographer', () => {
  expect(creditParts('Mario Andretti leads Ronnie Peterson · Photo Koen Suyk / Anefo, Nationaal Archief · CC0')).toEqual({ by: 'Koen Suyk / Anefo, Nationaal Archief', licence: 'CC0' })
  expect(creditParts('Liauzh · CC BY 4.0')).toEqual({ by: 'Liauzh', licence: 'CC BY 4.0' })
  expect(creditParts('no licence here')).toBeNull()
})

it('points every confirmed photo at a Wikimedia Commons file page', () => {
  for (const { source } of CREDITS) if (source !== null) expect(source).toStartWith('https://commons.wikimedia.org/wiki/File:')
})

it('counts every photo once, with or without a confirmed page', () => {
  expect(CREDITS.length).toBe(COUNTS.photos)
  expect(new Set(CREDITS.map((c) => c.src)).size).toBe(CREDITS.length)
  expect(COUNTS.photographers).toBe(new Set(CREDITS.map((c) => c.by)).size)
  expect(CREDITS.some((c) => c.usedOn === '')).toBe(false)
})

it('names the driver on every portrait row', () => {
  expect(CREDITS.find((c) => c.src === '/img/drivers/LEC.webp')?.place).toBe('Charles Leclerc · Cannes, 2026')
  expect(CREDITS.find((c) => c.src === '/img/ch02.jpg')?.usedOn).toContain('Menu')
})
