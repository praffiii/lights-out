import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, scrollToEnd, test, visibleBars } from './fixtures.ts'

const loaded = async (page: Page) => {
  await page.goto('/')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

test('leaves no text hidden after scrolling the whole page', async ({ page, errors }) => {
  await loaded(page)
  await scrollToEnd(page)

  expect(await hiddenText(page)).toEqual([])
  expect(await visibleBars(page)).toBe(0)
  expect(errors).toEqual([])
})

const cutText = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('main h1, main h2, main h3, main p, main dd')].flatMap((el) => {
      const box = el.getBoundingClientRect()

      return box.width > 0 && (box.right > document.documentElement.clientWidth + 1 || box.left < -12) ? [(el.textContent ?? '').trim().slice(0, 40)] : []
    }),
  )

test('has no horizontal overflow and no text cut at the edge', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })

  if (testInfo.project.name === 'phone') await page.setViewportSize({ width: 360, height: 780 })

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await cutText(page)).toEqual([])
})

test('shows everything at once under reduced motion', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.hero h1')).toBeVisible()
  expect(await hiddenText(page)).toEqual([])
  expect(await page.locator('canvas').count()).toBe(0)
  expect(errors).toEqual([])
})

for (const share of [0.55, 1]) {
  test(`starts at the top after a refresh at ${Math.round(share * 100)}% of the page`, async ({ page, errors }) => {
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => sessionStorage.setItem('scrollAtDomReady', String(scrollY)))
    })
    await loaded(page)
    await page.evaluate((s) => scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * s, behavior: 'instant' }), share)
    await page.waitForTimeout(600)
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)

    await page.reload()

    expect(await page.evaluate(() => sessionStorage.getItem('scrollAtDomReady'))).toBe('0')
    await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
    expect(await page.evaluate(() => scrollY)).toBe(0)
    await expect(page.locator('.hero h1')).toBeVisible()
    expect(errors).toEqual([])
  })
}
