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

for (const width of [320, 390, 760, 1470]) {
  test(`has no horizontal overflow and keeps the T1 pin clear at ${width}px`, async ({ page, errors }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await expect(page.locator('.tracker')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    const [tag, t1] = await Promise.all([page.locator('.hero .tag').boundingBox(), page.locator('[data-pin="turn-1"]').boundingBox()])

    if (tag && t1) expect(tag.x + tag.width <= t1.x || t1.x + t1.width <= tag.x || tag.y + tag.height <= t1.y || t1.y + t1.height <= tag.y).toBe(true)

    expect(errors).toEqual([])
  })
}
