import type { Page } from '@playwright/test'

import { expect, LOADER_MS, test } from './fixtures.ts'

const current = '.tracker [aria-current="true"]'

const lifted = (page: Page) => expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

test('freezes the lap while the tab is hidden and resumes without skipping cars', async ({ page, errors }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await lifted(page)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'PIA')
  await page.evaluate(setHidden, true)
  await page.clock.runFor(30_000)
  await page.evaluate(setHidden, false)
  await expect(page.locator(current)).toHaveAttribute('data-code', /PIA|NOR/)
  expect(errors).toEqual([])
})

test('shows car 01, filled sectors and no light under reduced motion', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await lifted(page)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'PIA')
  await expect(page.locator('.hero .tag')).toBeHidden()
  await page.getByRole('button', { name: 'Show Lando Norris, McLaren MCL40' }).click()
  await expect(page.locator('.tracker .driver')).toHaveText('Lando Norris')
  expect(errors).toEqual([])
})

test('Pause stops the gallery', async ({ page, errors }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await lifted(page)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-pressed', 'true')
  await page.clock.runFor(20_000)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'PIA')
  expect(errors).toEqual([])
})

test('keeps the gallery running with no circuit when the season API is warming', async ({ page, errors }) => {
  await page.route('**/api/season', (r) => r.fulfill({ status: 503, json: { status: 'warming' } }))
  test.setTimeout(90_000)
  await page.goto('/')
  await lifted(page)
  await expect(page.locator('.tracker')).toBeVisible()
  await expect(page.locator('.hero canvas')).toHaveCount(0)
  await page.clock.runFor(17_000)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'NOR')
  expect(errors.filter((e) => !e.includes('503'))).toEqual([])
})

const lapBar = (page: Page) => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.tracker .lap') ?? document.body).transform).a)

test('a car picked mid-lap starts its lap from the line', async ({ page, errors }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await lifted(page)
  await expect(page.locator('.hero .stage[data-gl]')).toHaveCount(1)
  await page.clock.runFor(3_000)
  expect(await lapBar(page)).toBeGreaterThan(0.1)
  await page.getByRole('button', { name: 'Show Max Verstappen, Red Bull RB22' }).click()
  await page.clock.runFor(300)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'VER')
  expect(await lapBar(page)).toBeLessThan(0.06)
  expect(errors).toEqual([])
})

test('keeps the lap running on a phone when the circuit arrives after the page loaded', async ({ page, errors }) => {
  test.setTimeout(90_000)
  await page.route('**/api/season', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3_000))
    await route.fallback()
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.hero .stage[data-gl]')).toHaveCount(1, { timeout: 20_000 })
  await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.hero')

    if (hero) scrollTo(0, hero.offsetTop + hero.offsetHeight - 120)
  })
  await page.clock.runFor(17_000)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'NOR')
  expect(errors).toEqual([])
})

for (const width of [320, 390, 760, 1470]) {
  test(`has no horizontal overflow and keeps the T1 pin above the tag at ${width}px`, async ({ page, errors }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await expect(page.locator('.tracker')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    await expect(page.locator('.hero .stage[data-gl]')).toHaveCount(1)
    await page.getByRole('button', { name: 'Pause' }).click()
    await page.addStyleTag({ content: '.hero .pins > span, .hero .tag { pointer-events: auto !important }' })

    const pinOnTop = await page.evaluate(() => {
      const pin = document.querySelector<HTMLElement>('[data-pin="turn-1"]')
      const tag = document.querySelector<HTMLElement>('.hero .tag')
      const stage = document.querySelector<HTMLElement>('.hero .stage')

      if (!pin || !tag || !stage) return false

      pin.scrollIntoView({ block: 'center' })

      const p = pin.getBoundingClientRect()
      const t = tag.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      const x = p.x + p.width / 2
      const y = p.y + p.height / 2

      tag.style.transform = `translate(${x - s.x + t.width / 2}px, ${y - s.y - t.height / 2}px)`

      return document.elementFromPoint(x, y)?.closest('[data-pin="turn-1"]') === pin
    })

    expect(pinOnTop).toBe(true)
    expect(errors).toEqual([])
  })
}
