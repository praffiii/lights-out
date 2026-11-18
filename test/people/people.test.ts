import { expect, it } from 'bun:test'

import { creditParts, CREDITS } from '../../src/credits/photos.ts'
import { PEOPLE } from '../../src/people/people.ts'

it('gives every race driver a credited Commons hero from 2024 to 2026', () => {
  expect(PEOPLE).toHaveLength(22)

  for (const { driverId, hero } of PEOPLE) {
    expect(hero.src).toBe(`/img/people/${driverId}-hero.jpg`)
    expect(hero.source).toStartWith('https://commons.wikimedia.org/wiki/File:')
    expect(creditParts(hero.credit)).not.toBeNull()
    expect(hero.place).toMatch(/ · .+, 20(24|25|26)$/)
  }
})

it('ships both crops of every hero', async () => {
  for (const { hero } of PEOPLE) {
    expect(await Bun.file(`public${hero.src}`).exists()).toBe(true)
    expect(await Bun.file(`public${hero.src.replace(/\.jpg$/, '-phone.jpg')}`).exists()).toBe(true)
  }
})

it('lists every hero in the credits as used on The people', () => {
  for (const { hero } of PEOPLE) expect(CREDITS.find((c) => c.source === hero.source)?.usedOn.split(', ')).toContain('The people')
})

it('marks the portraits the Next band shows as used on The people', () => {
  expect(CREDITS.find((c) => c.src === '/img/drivers/ALO.webp')?.usedOn.split(', ')).toContain('The people')
})

it('credits the Senna photo of the legends on The people', async () => {
  const senna = CREDITS.find((c) => c.src === '/img/people/senna-1991.jpg')

  expect(senna).toMatchObject({
    by: 'George Voudouris',
    licence: 'CC BY-SA 4.0',
    usedOn: 'The people',
    source: 'https://commons.wikimedia.org/wiki/File:Ayrton_Senna_during_the_race_in_Spa-Francorchamps_on_25_August_1991.jpg',
  })
  expect(await Bun.file('public/img/people/senna-1991.jpg').exists()).toBe(true)
})
