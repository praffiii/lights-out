import type { Page } from '@playwright/test'

import { expect, LOADER_MS, test } from './fixtures.ts'

const PATH = '/chapters/overtaking'

const loaded = async (page: Page, path = PATH) => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.chapter-page ${selector}`)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText('Every pass starts longbefore the corner.')
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

  for (const selector of ['.photo-band .credit', '.frames .credit', '.air .credit', '.next .credit']) await expect(chapter(page, selector)).toContainText('CC BY')
})

test('a word chip opens its definition', async ({ page }) => {
  await loaded(page)

  await chapter(page, '.words').getByRole('button', { name: 'Overtake Mode', exact: true }).click()

  await expect(chapter(page, '.words > .def')).toContainText('Overtake Mode')
})

test('the hero nav leads back to chapter 01', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.opening').getByRole('link', { name: /01 A race weekend/ })).toHaveAttribute('href', '/chapters/race-weekend')
  await expect(chapter(page, '.opening .nav .is-soon')).toContainText('03 Tyres and strategy')
})

test('the DRS table lists three tools', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.rules tbody th')).toHaveText(['DRSUntil 2025', 'Straight mode', 'Overtake ModeNew'])
})
