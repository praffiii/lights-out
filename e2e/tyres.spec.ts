import type { Page } from '@playwright/test'

import { expect, LOADER_MS, test } from './fixtures.ts'

const PATH = '/chapters/tyres-and-strategy'

const loaded = async (page: Page, path = PATH) => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.chapter-page ${selector}`)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText('A race is wonin the pit lane.')
    await expect(page).toHaveTitle('Tyres and strategy · Lights Out')
    expect(errors).toEqual([])
  })
}

test('no horizontal overflow on the page', async ({ page, errors }) => {
  await loaded(page)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  expect(overflow).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})

test('every photo is credited', async ({ page }) => {
  await loaded(page)

  for (const selector of ['.photo-band .credit', '.tyres .credit', '.cheap .credit', '.next .credit']) await expect(chapter(page, selector)).toContainText('CC')
})

test('five compounds, three dry and two wet', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.compounds li')).toHaveCount(5)
  await expect(chapter(page, '.compounds .tag')).toHaveText(['Dry', 'Dry', 'Dry', 'Wet', 'Wet'])
})

test('pit loss is labelled an estimate', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.cost .source')).toContainText('MultiViewer estimate')
  await expect(chapter(page, '.cheap .stats')).toContainText('12.7 s')
})

test('the payoff is true to the race', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.ways .payoff')).toContainText('Antonelli got ahead of Norris without passing him on track.')
})

test('a word chip opens its definition', async ({ page }) => {
  await loaded(page)

  await chapter(page, '.words').getByRole('button', { name: 'Undercut', exact: true }).click()

  await expect(chapter(page, '.words > .def')).toContainText('Undercut')
})

test('the hero nav leads back to chapter 02', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.opening').getByRole('link', { name: /02 How overtaking works/ })).toHaveAttribute('href', '/chapters/overtaking')
  await expect(chapter(page, '.opening .nav .is-soon')).toContainText('04 Flags and what they mean')
})
