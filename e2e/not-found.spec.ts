import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, stubSeason, test } from './fixtures.ts'

const LOST = '/pit-lane-gossip'

const visit = async (page: Page, path = LOST) => {
  await stubSeason(page)

  const response = await page.goto(path)

  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

  return response?.status()
}

const real = (errors: ReadonlyArray<string>) => errors.filter((error) => !error.includes('status of 404'))

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

const robots = (page: Page) => page.locator('meta[name=robots]')

for (const colorScheme of ['light', 'dark'] as const) {
  test(`an unknown address is a DNF with a 404 status, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    expect(await visit(page)).toBe(404)

    await expect(page.locator('.not-found h1')).toHaveText('DNF')
    await expect(page.locator('.not-found h2')).toHaveText('This page did not finish.')
    await expect(page).toHaveTitle('Page not found · Lights Out')
    await expect(robots(page)).toHaveAttribute('content', 'noindex')
    expect(await page.locator('.not-found nav a').evaluateAll((els) => els.map((el) => el.getAttribute('href')))).toEqual(['/', '/#start', '/season', '/glossary'])
    await expect(page.locator('.header')).toBeVisible()
    await expect(page.locator('.footer')).toBeAttached()
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    expect(real(errors)).toEqual([])
  })
}

test('race control names the address on desktop', async ({ page, isMobile }) => {
  await visit(page)

  const line = page.locator('.not-found .race-control')

  await expect(line).toContainText(LOST)
  await expect(line).toBeVisible({ visible: !isMobile })
})

test('an address that looks like HTML stays text', async ({ page, errors }) => {
  await visit(page, '/%3Cimg%20src=x%20onerror=alert(1)%3E')

  await expect(page.locator('.not-found .race-control img')).toHaveCount(0)
  await expect(page.locator('.not-found .race-control')).toContainText('<img')
  expect(real(errors)).toEqual([])
})

test('a very long address keeps to one line and never scrolls sideways', async ({ page, isMobile }) => {
  await visit(page, `/${'gossip'.repeat(70)}`)

  expect(await overflow(page)).toBeLessThanOrEqual(0)

  if (!isMobile) expect((await page.locator('.not-found .race-control').boundingBox())?.height).toBeLessThan(24)
})

test('a malformed address never breaks the server', async ({ request }) => {
  expect((await request.get('/%E0%A4%A')).status()).toBeLessThan(500)
})

for (const path of ['/lap/a/b', '/season/xyz', '/tracks/a/b', '/api/season/x', `/season/${'gossip'.repeat(70)}`]) {
  test(`a bad address below a real one is the same page: ${path.slice(0, 20)}`, async ({ page }) => {
    expect(await visit(page, path)).toBe(404)

    await expect(page.locator('.not-found h1')).toHaveText('DNF')
    await expect(page).toHaveTitle('Page not found · Lights Out')
    await expect(robots(page)).toHaveAttribute('content', 'noindex')
    await expect(page.locator('.not-found .shot img')).toHaveCSS('object-fit', 'cover')
    await expect(page.locator('.header')).toBeVisible()
    await expect(page.locator('.footer')).toBeAttached()
    expect(await overflow(page)).toBeLessThanOrEqual(0)
  })
}

test('real pages stay open to search engines', async ({ page }) => {
  for (const path of ['/', '/season', '/people/antonelli', '/lap/monza']) {
    await page.goto(path)
    await expect(robots(page)).toHaveCount(0)
  }
})

test('leaving the page takes its title and robots tag with it', async ({ page, errors }) => {
  await visit(page)
  await page.locator('.not-found nav a', { hasText: 'Glossary' }).click()

  await expect(page).toHaveURL(/\/glossary\/?$/)
  await expect(page).toHaveTitle('Glossary · Lights Out')
  await expect(robots(page)).toHaveCount(0)
  await expect(page.locator('.not-found')).toHaveCount(0)
  expect(real(errors)).toEqual([])
})

test('the How F1 works link lands on the chapters', async ({ page }) => {
  await visit(page)
  await page.locator('.not-found nav a', { hasText: 'How F1 works' }).click()

  await expect(page).toHaveURL(/\/#start$/)
  await expect(page.locator('#start')).toBeInViewport()
})

test('reduced motion shows everything still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await visit(page)

  expect(await hiddenText(page)).toEqual([])
  await expect(page.locator('.not-found .shot img')).toHaveCSS('opacity', '1')
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the message and the photo show', async ({ page }) => {
    await page.goto(LOST)

    await expect(page.locator('.not-found h2')).toBeVisible()
    await expect(page.locator('.not-found .shot img')).toBeVisible()
  })
})
