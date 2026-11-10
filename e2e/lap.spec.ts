import type { Page } from '@playwright/test'

import { expect, LOADER_MS, test } from './fixtures.ts'

const IDS = { interlagos: 'Interlagos', vegas: 'Las Vegas', losail: 'Lusail', yas_marina: 'Yas Marina', albert_park: 'Albert Park' } as const

const lifted = (page: Page) => expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

const open = async (page: Page, path: string) => {
  await page.goto(path)
  await lifted(page)
}

const explore = async (page: Page) => {
  const link = page.getByText('Explore the lap in 3D')

  await page.mouse.move(700, 300)
  await expect(async () => {
    await page.mouse.wheel(0, 600)
    await expect(link).toBeVisible({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  await link.click()
}

test('the band opens the lap explorer for its circuit', async ({ page, errors }) => {
  await open(page, '/weekend')
  await explore(page)
  await expect(page).toHaveURL(/\/lap\/interlagos$/)
  await expect(page.locator('h1')).toHaveText('Interlagos')
  await expect(page.locator('.header, .footer, .menu')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('close and Escape go back to the weekend page', async ({ page, errors }) => {
  await open(page, '/weekend')
  await explore(page)
  await expect(page.locator('h1')).toHaveText('Interlagos')
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/weekend\/?$/)
  await explore(page)
  await expect(page.locator('h1')).toHaveText('Interlagos')
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page).toHaveURL(/\/weekend\/?$/)
  expect(errors).toEqual([])
})

test('a direct visit closes to the weekend page', async ({ page, errors }) => {
  await open(page, '/lap/vegas')
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page).toHaveURL(/\/weekend\/?$/)
  await expect(page.locator('.header')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('every circuit has its own lap page', async ({ page, errors }) => {
  test.setTimeout(90_000)

  for (const [id, name] of Object.entries(IDS)) {
    await open(page, `/lap/${id}`)
    await expect(page.locator('h1')).toHaveText(name)
  }

  expect(errors).toEqual([])
})

test('an unknown circuit says there is no 3D lap yet', async ({ page }) => {
  await open(page, '/lap/monaco')
  await expect(page.getByText('No 3D lap for this circuit yet')).toBeVisible()
  await expect(page.locator('a[href="/weekend"]')).toBeVisible()
})

test('the wheel never scrolls the lap page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await open(page, '/lap/vegas')
  await page.mouse.move(400, 400)
  await page.mouse.wheel(0, 2000)
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => scrollY)).toBe(0)
})

const drive = async (page: Page, path = '/lap/vegas') => {
  await open(page, path)
  await expect(page.locator('.lap')).toHaveAttribute('data-ready', '', { timeout: 20_000 })
  await page.mouse.move(700, 400)
}

const km = async (page: Page) => Number(await page.locator('[data-km]').textContent())

const thrown = (errors: string[]) => errors.filter((e) => e.startsWith('pageerror'))

test('cruises by itself once the loader lifts', async ({ page, errors }) => {
  await drive(page)
  await page.clock.runFor(2000)
  await expect(page.locator('.lap')).toHaveAttribute('data-mode', 'auto')

  const before = await km(page)

  await page.clock.runFor(3000)
  expect(await km(page)).toBeGreaterThan(before)
  expect(thrown(errors)).toEqual([])
})

test('a scroll takes the wheel and the light holds still', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await drive(page)
  await page.mouse.wheel(0, 1400)
  await page.clock.runFor(4000)

  const held = await km(page)

  await page.clock.runFor(3000)
  expect(await km(page)).toBe(held)
  await expect(page.locator('.lap')).toHaveAttribute('data-mode', 'you')
})

test('tapping a turn number glides to that corner', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await drive(page)
  await page.locator('.lap .ticks button', { hasText: /^05$/ }).click()
  await page.clock.runFor(2000)
  await expect(page.locator('.lap .callout')).toContainText('T05')
})

test('the right arrow glides to the next turn', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await drive(page)
  await page.mouse.wheel(0, 100)
  await page.keyboard.press('ArrowRight')
  await page.clock.runFor(2000)
  await expect(page.locator('.lap .callout')).toBeVisible()
})

test('Resume hands the lap back to auto', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await drive(page)
  await page.mouse.wheel(0, 1400)
  await page.clock.runFor(1000)
  await page.locator('.lap .mode').click()
  await expect(page.locator('.lap')).toHaveAttribute('data-mode', 'auto')

  const before = await km(page)

  await page.clock.runFor(3000)
  expect(await km(page)).toBeGreaterThan(before)
})

test('scrolling back across the line wraps to the end of the lap', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await drive(page)
  await page.mouse.wheel(0, -1400)
  await page.clock.runFor(2000)
  await expect(page.locator('[data-sector]')).toHaveText('S3')
  expect(await km(page)).toBeGreaterThan(3)
})

test('a second visit cruises at the normal pace', async ({ page, errors }) => {
  await open(page, '/weekend')
  await explore(page)
  await expect(page.locator('.lap')).toHaveAttribute('data-ready', '', { timeout: 20_000 })
  await page.clock.runFor(2000)
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/weekend\/?$/)
  await explore(page)
  await expect(page.locator('.lap')).toHaveAttribute('data-ready', '', { timeout: 20_000 })
  await page.clock.runFor(2000)

  const before = await km(page)

  await page.clock.runFor(3000)
  expect(await km(page)).toBeGreaterThan(before)
  expect(thrown(errors)).toEqual([])
})
