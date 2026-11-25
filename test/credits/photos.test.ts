import { expect, it } from 'bun:test'

import { COUNTS, creditParts, CREDITS } from '../../src/credits/photos.ts'
import { STORY_PHOTOS } from '../../src/people/story.ts'
import { NEXT_PEOPLE } from '../../src/tracks/pages.ts'

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
  expect(CREDITS.find((c) => c.src === '/img/cars/nor.webp')?.usedOn).toBe('Home, This season, Chapter 03, The people')
  expect(CREDITS.find((c) => c.src === '/img/cars/pia.webp')?.usedOn).toBe('Home, This season')
  expect(CREDITS.find((c) => c.src === '/img/cars/gas.webp')?.usedOn).toBe('Home, This season, Race weekend, The people')
})

it('credits the photo the Next band on The tracks shows', () => {
  const row = CREDITS.find((c) => c.source === NEXT_PEOPLE.photo.source)

  expect(row?.usedOn.split(', ')).toContain('The tracks')
})

it('credits the three photos of the Antonelli story on The people', () => {
  for (const photo of STORY_PHOTOS) expect(CREDITS.find((c) => c.src === photo.src)?.usedOn.split(', ')).toContain('The people')
})

it('credits the dark hero photo to the menu alone, now that chapter 06 no longer ends with it', () => {
  expect(CREDITS.find((c) => c.src === '/img/hero-dark.jpg')?.usedOn).toBe('Menu')
})

it('credits the recovery photo to the 404 page', () => {
  expect(CREDITS.find((c) => c.src === '/img/not-found.jpg')?.usedOn).toBe('404')
})
