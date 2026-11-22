import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, scrollToEnd, test } from './fixtures.ts'

const PATH = '/chapters/power-unit'

const loaded = async (page: Page) => {
  await page.goto(PATH)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.chapter-page ${selector}`)

const JOBS = [
  '1.6 litres, six cylinders. Burns fuel for about half the power.',
  'Exhaust gas spins it, and it packs more air into the engine.',
  'An electric motor geared to the crank. Pushes, or brakes and charges.',
  'The battery. It holds what the MGU-K harvests.',
  'Sends the power between battery and motor.',
]

const CHIPS = ['Power unit', 'MGU-K', 'MGU-H · until 2025', 'Energy store', 'Turbocharger', 'Harvesting', 'Deployment', 'Overtake Mode', 'Sustainable fuel']

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText('Half fuel.Half battery.')
    await expect(page).toHaveTitle('The power unit · Lights Out')
    expect(errors).toEqual([])
  })

  test(`the pole-lap band sits in the opposite theme, ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    const [band, body] = await page.evaluate(() => [
      getComputedStyle(document.querySelector('.lap-band') ?? document.body).backgroundColor,
      getComputedStyle(document.body).backgroundColor,
    ])

    expect(band).not.toBe(body)
  })
}

test('no horizontal overflow and every photo is credited', async ({ page, errors }) => {
  await loaded(page)
  await scrollToEnd(page)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  expect(overflow).toBeLessThanOrEqual(0)
  expect(await hiddenText(page)).toEqual([])

  for (const selector of [
    '.photo-band .credit',
    '.mguh .credit',
    '.history figure:nth-child(1) .credit',
    '.history figure:nth-child(2) .credit',
    '.history figure:nth-child(3) .credit',
    '.history figure:nth-child(4) .credit',
    '.next .credit',
  ])
    await expect(chapter(page, selector)).toContainText(/CC|Public domain/)

  expect(errors).toEqual([])
})

test('Five parts shows five pins on desktop or five tags and rows on a phone', async ({ page, errors }, testInfo) => {
  await loaded(page)

  if (testInfo.project.name === 'desktop') {
    await expect(chapter(page, '.five-parts .pin')).toHaveCount(5)
    await expect(chapter(page, '.five-parts .pin .job')).toHaveText(JOBS, { useInnerText: true })
  } else {
    await expect(chapter(page, '.five-parts .tag')).toHaveCount(5)
    await expect(chapter(page, '.five-parts .part-rows li')).toHaveCount(5)
    await expect(chapter(page, '.five-parts .part-rows .job')).toHaveText(JOBS, { useInnerText: true })
  }

  expect(errors).toEqual([])
})

test('shows the 2026 numbers, payoff, plus row and glossary chips in order', async ({ page, errors }) => {
  await loaded(page)

  expect(await chapter(page, '.figures-grid .val').allTextContents()).toEqual(['400', '350', '1.6', '0'])
  await expect(chapter(page, '.numbers-band .payoff')).toContainText('Together, about 750 kW. More than 1,000 hp.')
  await expect(chapter(page, '.numbers-band .plus')).toContainText('+0.5 MJ')
  await expect(chapter(page, '.numbers-band .plus a')).toHaveAttribute('href', '/chapters/overtaking')
  expect(await chapter(page, '.words .chips button').allTextContents()).toEqual(CHIPS)
  expect(errors).toEqual([])
})

test('ends with the weekend band', async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.next .caption > p')).toHaveText('Next · Round 20 · this weekend')
  await expect(chapter(page, '.next h2')).toHaveText('São Paulo,this weekend.')
  await expect(chapter(page, '.next .read')).toHaveAttribute('href', '/weekend')
  expect(errors).toEqual([])
})

test('menu, Home and Chapter 05 lead here and Home reads six chapters', async ({ page, errors }) => {
  await page.goto('/')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

  await expect(page.locator('.chapters .head')).toContainText('Six chapters · 35 min')
  await expect(page.locator('.rows li:nth-child(6) a')).toHaveAttribute('href', PATH)
  await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.locator('.menu nav .line > a', { hasText: 'The engine' })).toHaveAttribute('href', PATH)

  await page.goto('/chapters/inside-the-car')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

  await expect(chapter(page, '.opening').getByRole('link', { name: /06 The power unit/ })).toHaveAttribute('href', PATH)
  await expect(chapter(page, '.next .read')).toHaveAttribute('href', PATH)
  expect(errors).toEqual([])
})

test('/api/pole/latest wins over /api/pole/$circuit', async ({ page }) => {
  const response = await page.request.get('/api/pole/latest')

  expect([200, 204]).toContain(response.status())
  expect(await response.text()).not.toBe('{"status":"none"}')
})
