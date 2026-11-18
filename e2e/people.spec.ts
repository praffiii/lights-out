import { readFileSync } from 'node:fs'

import type { Page } from '@playwright/test'

import { expect, LOADER_MS, stubSeason, test } from './fixtures.ts'

const loaded = async (page: Page, path: string) => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

const races = (page: Page) => page.locator('.races tbody tr')

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the Ocon page reads his season, career and every race from data, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page, '/people/ocon')

    await expect(page).toHaveTitle('Esteban Ocon · The people · Lights Out')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esteban Ocon.')
    await expect(page.getByText('French, 30. In Formula 1 since 2016, with five teams.')).toBeVisible()
    await expect(page.getByText('Sixteenth in 2026.')).toBeVisible()
    await expect(page.locator('.career')).toContainText('198')
    await expect(page.locator('.career')).toContainText('One win: Hungary, 2021.')
    await expect(races(page)).toHaveCount(20)
    await expect(page.locator('.races tr.is-best')).toHaveCount(1)
    await expect(page.locator('.races tr.is-best')).toContainText('Azerbaijan')
    await expect(page.locator('.races tr.is-dnr')).toHaveCount(2)
    await expect(page.locator('.next a')).toHaveAttribute('href', '/people/alonso')
    expect(await noOverflow(page)).toBe(true)
    expect(errors).toEqual([])
  })
}

test('every race row on a phone is one line high', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await loaded(page, '/people/ocon')
  await expect(races(page)).toHaveCount(20)

  const heights = await races(page).evaluateAll((rows) => rows.map((row) => Math.round(row.getBoundingClientRect().height)))

  expect(new Set(heights).size).toBe(1)
  expect(errors).toEqual([])
})

test('a driver without a career yet still shows the season', async ({ page, errors }) => {
  await loaded(page, '/people/gasly')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pierre Gasly.')
  await expect(page.locator('.season-numbers')).toBeVisible()
  await expect(page.locator('.career')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('a driver who is not on the grid has no page', async ({ page }) => {
  await loaded(page, '/people/tsunoda')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('No page for this driver yet')
})

test('a 503 shows the waiting line', async ({ page, errors }) => {
  await stubSeason(page, { status: 503, body: JSON.stringify({ status: 'warming' }) })
  await loaded(page, '/people/ocon')

  await expect(page.getByText('The season data is on its way. Try again in a minute.')).toBeVisible()
  expect(errors.filter((e) => !e.includes('503'))).toEqual([])
})

test('a snapshot from before the people data shows the waiting line', async ({ page, errors }) => {
  const { people: _, ...older } = JSON.parse(readFileSync('test/fixtures/season-snapshot.json', 'utf8'))

  await stubSeason(page, { status: 200, body: JSON.stringify(older) })
  await loaded(page, '/people/ocon')

  await expect(page.getByText('The season data is on its way. Try again in a minute.')).toBeVisible()
  expect(errors).toEqual([])
})

test('every photo on the Ocon page is credited', async ({ page, errors }) => {
  await loaded(page, '/people/ocon')
  await expect(page.locator('.next img')).toHaveCount(1)

  const missing = await page.evaluate(() =>
    [...document.querySelectorAll('main img')].flatMap((img) =>
      /Public domain|CC/.test(img.closest('figure, section')?.querySelector('.credit')?.textContent ?? '') ? [] : [img.getAttribute('src')],
    ),
  )

  expect(await page.locator('main img').count()).toBeGreaterThanOrEqual(2)
  expect(missing).toEqual([])
  expect(errors).toEqual([])
})
