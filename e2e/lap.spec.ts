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

  await link.scrollIntoViewIfNeeded()
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

test('the wheel never scrolls the lap page', async ({ page }) => {
  await open(page, '/lap/vegas')
  await page.mouse.move(400, 400)
  await page.mouse.wheel(0, 2000)
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => scrollY)).toBe(0)
})
