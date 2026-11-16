import type { Page } from '@playwright/test'

import { COUNTS } from '../src/credits/photos.ts'
import { expect, LOADER_MS, stubSeason, test } from './fixtures.ts'

const loaded = async (page: Page, path = '/credits') => {
  await stubSeason(page)
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const rows = (page: Page) => page.locator('.credits-page .photos li')

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(page.locator('.credits-page h1')).toHaveText("Built on otherpeople's work.")
    await expect(page).toHaveTitle('Credits · Lights Out')
    await expect(page.locator('.credits-page .figures b')).toHaveText([String(COUNTS.photos), String(COUNTS.photographers), '0'])
    expect(errors).toEqual([])
  })
}

test('eight photos show, then all of them, each linked to its Commons page', async ({ page, errors }) => {
  await loaded(page)

  await expect(rows(page)).toHaveCount(COUNTS.photos)
  await expect(rows(page).filter({ visible: true })).toHaveCount(8)

  await page.getByText(`Show all ${COUNTS.photos} photos ↓`).click()
  await expect(rows(page).filter({ visible: true })).toHaveCount(COUNTS.photos)

  const links = await rows(page).locator('a').evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''))

  expect(links).toHaveLength(COUNTS.photos)
  expect(links.every((href) => href.startsWith('https://commons.wikimedia.org/wiki/File:'))).toBe(true)
  expect(errors).toEqual([])
})

test('the footer leads to the credits', async ({ page, errors }) => {
  await loaded(page, '/glossary')
  await page.locator('.footer .site a', { hasText: 'Credits' }).click()

  await expect(page).toHaveURL(/\/credits\/?$/)
  await expect(page.locator('.credits-page h1')).toBeVisible()
  expect(errors).toEqual([])
})

test('the page never scrolls sideways', async ({ page, errors }) => {
  await loaded(page)
  await page.getByText(`Show all ${COUNTS.photos} photos ↓`).click()

  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})
