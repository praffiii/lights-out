import type { Page } from '@playwright/test'

import { expect, LOADER_MS, stubSeason, test } from './fixtures.ts'

const loaded = async (page: Page, path: string) => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const toBand = async (page: Page) => {
  await page.locator('.sizes .head').scrollIntoViewIfNeeded()
  await page.locator('.sizes-note').scrollIntoViewIfNeeded()
}

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the index shows every circuit at one scale with the next race lit, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page, '/tracks')
    await toBand(page)

    await expect(page).toHaveTitle('The tracks · Lights Out')
    await expect(page.locator('.tracks-page h1')).toContainText('tracks this')
    await expect(page.locator('.sizes .cell').filter({ visible: true })).toHaveCount(23)
    await expect(page.locator('.sizes .chip').filter({ visible: true })).toHaveText(/^(20 · Interlagos · 4\.309 km|20 Interlagos)$/)
    await expect(page.locator('.sizes img.patch').filter({ visible: true })).toHaveAttribute('src', /-br-1940\.webp$/)
    await expect(page.locator('.sizes a.cell').filter({ visible: true })).toHaveAttribute('href', '/tracks/vegas')
    await expect(page.getByText('Pick a track with → to open it')).toBeVisible()
    await expect(page.locator('.sizes')).toHaveCSS('background-color', 'rgb(6, 8, 14)')
    expect(await noOverflow(page)).toBe(true)
    expect(errors).toEqual([])
  })
}

test('with no season data nothing is lit and every label is plain', async ({ page }) => {
  await stubSeason(page, { status: 500, body: '' })
  await loaded(page, '/tracks')
  await toBand(page)

  await expect(page.locator('.sizes .cell').filter({ visible: true })).toHaveCount(23)
  await expect(page.locator('.sizes .chip')).toHaveCount(0)
  await expect(page.locator('.sizes img.patch')).toHaveCount(0)
})

test('the hero facts come from the calendar', async ({ page }) => {
  await loaded(page, '/tracks')

  await expect(page.locator('.tracks-page .facts dd')).toHaveText([/Spa\s*7\.004 km/, /Monaco\s*3\.337 km/, /Madring\s*Madrid, 2026/])
})

test('the menu leads to the tracks', async ({ page, errors }) => {
  await loaded(page, '/')
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.locator('.menu nav .line > a', { hasText: 'The tracks' }).click()

  await expect(page).toHaveURL(/\/tracks$/)
  await expect(page.locator('.tracks-page h1')).toContainText('tracks this')
  expect(errors).toEqual([])
})
