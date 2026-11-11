import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, scrollToEnd, stubPole, stubSeason, test, visibleBars } from './fixtures.ts'

test.use({ timezoneId: 'Asia/Jakarta' })

const PATH = '/chapters/race-weekend'

const loaded = async (page: Page, path = PATH) => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.chapter-page ${selector}`)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText('Three days.One race.')
    await expect(chapter(page, '.days')).toHaveAttribute('data-theme', colorScheme === 'light' ? 'dark' : 'light')
    expect(errors).toEqual([])
  })
}

test('the weekend line names São Paulo in track and visitor days', async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.days .now')).toContainText('This weekend · São Paulo GP · Fri–Sun at the track, Fri–Mon your time')
  await expect(chapter(page, '.days .now a')).toHaveAttribute('href', '/weekend')
  expect(errors).toEqual([])
})

test('the Sprint toggle swaps the sessions', async ({ page, errors }) => {
  await loaded(page, `${PATH}?reduced`)

  const sprint = chapter(page, '.days').getByRole('button', { name: 'Sprint', exact: true })

  await expect(sprint).toHaveAttribute('aria-pressed', 'false')
  await sprint.click()
  await expect(sprint).toHaveAttribute('aria-pressed', 'true')
  await expect(chapter(page, '.days')).toContainText('Sprint qualifying')
  await expect(chapter(page, '.days')).not.toContainText('Practice 2')
  expect(errors).toEqual([])
})

test('a word chip opens its definition', async ({ page, errors }) => {
  await loaded(page, `${PATH}?reduced`)

  const chip = chapter(page, '.words').getByRole('button', { name: 'Parc fermé' })

  await chip.click()
  await expect(chip).toHaveAttribute('aria-expanded', 'true')
  await expect(chapter(page, '.words').getByRole('note')).toContainText("Saturday's car is Sunday's car")
  expect(errors).toEqual([])
})

test('the knockout carries the latest qualifying, without the broken Q1 group', async ({ page, errors }) => {
  await loaded(page, `${PATH}?reduced`)

  await expect(chapter(page, '.knockout')).toContainText('out: COL PIA BOR BEA SAI ALB')
  await expect(chapter(page, '.knockout')).toContainText('pole: HAM 1:16.514')
  await expect(chapter(page, '.knockout')).not.toContainText('out: ALO')
  await expect(chapter(page, '.ladder')).toContainText('Scored at the Mexico City GP')
  expect(errors).toEqual([])
})

test('the pole band replays Interlagos and shows a still under reduced motion', async ({ page, errors }) => {
  await stubPole(page, 'interlagos')
  await loaded(page, `${PATH}?reduced`)

  const stage = chapter(page, '.band .stage')

  await stage.scrollIntoViewIfNeeded()
  await expect(stage).toHaveAttribute('data-gl', '', { timeout: 20_000 })
  await expect(chapter(page, '.band .replay .lapclock')).toHaveText('1:27.470')
  await expect(chapter(page, '.band .car')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('chapter 01 leads on to chapter 02', async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.opening').getByRole('link', { name: /02 How overtaking works/ })).toHaveAttribute('href', '/chapters/overtaking')

  const card = chapter(page, '.next').getByRole('link', { name: /Why a pass starts a lap early/ })

  await expect(card).toHaveAttribute('href', '/chapters/overtaking')
  await card.click()
  await expect(page.locator('.overtaking-page h1')).toHaveText('Every pass starts longbefore the corner.')
  expect(errors).toEqual([])
})

test('a 503 still teaches the weekend', async ({ page, errors }) => {
  await stubSeason(page, { status: 503, body: JSON.stringify({ status: 'warming' }) })
  await loaded(page)

  await expect(chapter(page, 'h1')).toBeVisible()
  await expect(chapter(page, '.knockout')).toBeVisible()
  await expect(chapter(page, '.band')).toHaveCount(0)
  await expect(chapter(page, '.days .now')).toHaveCount(0)
  expect(errors.filter((e) => !e.includes('503'))).toEqual([])
})

test('after scrolling to the end no text is hidden', async ({ page, errors }) => {
  await loaded(page)
  await scrollToEnd(page)

  expect(await hiddenText(page)).toEqual([])
  expect(await visibleBars(page)).toBe(0)
  expect(errors).toEqual([])
})

test('no horizontal overflow at 390 px', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await loaded(page)

  await expect(chapter(page, '.next')).toBeAttached()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  expect(errors).toEqual([])
})

test('the pole band poster fills the stage edge to edge', async ({ page, errors }) => {
  await stubPole(page, 'interlagos')
  await loaded(page)

  const poster = chapter(page, '.band .stage img.poster')

  await expect(poster).toBeAttached()
  expect(await poster.evaluate((n) => getComputedStyle(n).padding)).toBe('0px')
  expect(errors).toEqual([])
})

test('hovering a term keeps its definition on screen', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)

  for (const name of ['parc fermé', 'pole']) {
    await chapter(page, '.knockout').getByRole('button', { name, exact: true }).hover()
    await expect(chapter(page, '.knockout .term .def:visible')).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  }

  expect(errors).toEqual([])
})

test('tapping a second term shows only its definition', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await loaded(page)

  const knockout = chapter(page, '.knockout')

  await knockout.getByRole('button', { name: 'parc fermé', exact: true }).tap()
  await knockout.getByRole('button', { name: 'grid', exact: true }).tap()

  await expect(knockout.locator('.term .def:visible')).toHaveCount(1)
  await expect(knockout.locator('.term .def:visible')).toContainText('Grid')
  expect(errors).toEqual([])
})

test('the points ladder stays inside the window while fast scrolling widens the type', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page, `${PATH}?reduced`)
  await page.evaluate(() => document.querySelector('main')?.style.setProperty('--wdth', '112'))

  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})
