import { readFileSync } from 'node:fs'

import type { Page } from '@playwright/test'

import { PEOPLE } from '../src/people/people.ts'
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

test('no race cell is cut off on a phone', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  test.setTimeout(120_000)
  const cut: Array<string> = []

  for (const { driverId } of PEOPLE) {
    await loaded(page, `/people/${driverId}`)
    await expect(races(page)).toHaveCount(20)

    const cells = await page.locator('.races tbody td').evaluateAll((tds) => tds.filter((td) => td.checkVisibility() && td.scrollWidth > td.clientWidth).map((td) => td.textContent ?? ''))

    cut.push(...cells.map((text) => `${driverId}: ${text}`))
  }

  expect(cut).toEqual([])
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
  await expect(page.getByRole('link', { name: 'All the people' })).toHaveAttribute('href', '/people')
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

for (const path of ['/people/ocon', '/people']) {
  test(`every photo on ${path} is credited`, async ({ page, errors }) => {
    await loaded(page, path)
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
}

const tower = (page: Page) => page.locator('.tower li')

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the index counts the grid and lists every driver in a timing tower, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page, '/people')

    await expect(page).toHaveTitle('The people · Lights Out')
    await expect(page.locator('.people-index h1')).toContainText('22')
    await expect(page.locator('.people-index h1')).toContainText('drivers on the grid.')
    await expect(tower(page)).toHaveCount(25)
    await expect(page.locator('.tower li > a')).toHaveCount(22)
    await expect(tower(page).filter({ hasText: 'Yuki Tsunoda' }).locator('a')).toHaveCount(0)
    await expect(page.locator('.tower-note')).toContainText('Ryo Hirakawa (Haas, round 19)')
    await expect(page.locator('.champion a')).toHaveAttribute('href', '/people/antonelli')
    await expect(page.locator('.next a')).toHaveAttribute('href', '/season')
    expect(await noOverflow(page)).toBe(true)
    expect(errors).toEqual([])
  })
}

test('hovering a tower row previews the driver', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name === 'phone')
  await loaded(page, '/people')

  const row = tower(page).filter({ hasText: 'Lewis Hamilton' })

  await row.hover()
  await expect(row.locator('.thumb img')).toBeVisible()
  await expect(row.getByText('Read  →')).toBeVisible()
  expect(errors).toEqual([])
})

test('a tower row opens the driver page', async ({ page, errors }) => {
  await loaded(page, '/people')
  await tower(page).filter({ hasText: 'Esteban Ocon' }).locator('a').click()

  await expect(page).toHaveURL(/\/people\/ocon$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esteban Ocon.')
  expect(errors).toEqual([])
})

test('the menu and the track pages lead to the people', async ({ page, errors }) => {
  await loaded(page, '/tracks')
  await expect(page.locator('.next a')).toHaveAttribute('href', '/people')

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.locator('.menu nav .line > a', { hasText: 'The people' }).click()

  await expect(page).toHaveURL(/\/people$/)
  await expect(page.locator('.people-index h1')).toContainText('drivers on the grid.')
  expect(errors).toEqual([])
})

test('the index shows the waiting line on a 503', async ({ page, errors }) => {
  await stubSeason(page, { status: 503, body: JSON.stringify({ status: 'warming' }) })
  await loaded(page, '/people')

  await expect(page.getByText('The season data is on its way. Try again in a minute.')).toBeVisible()
  expect(errors.filter((e) => !e.includes('503'))).toEqual([])
})
