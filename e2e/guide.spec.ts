import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, scrollToEnd, stubSeason, test, visibleBars } from './fixtures.ts'

const PATH = '/chapters'

const CHAPTERS = [
  '/chapters/race-weekend',
  '/chapters/overtaking',
  '/chapters/tyres-and-strategy',
  '/chapters/flags',
  '/chapters/inside-the-car',
  '/chapters/power-unit',
  '/chapters/defending',
  '/chapters/championships',
  '/chapters/drs',
]

const WIDTHS = [320, 390, 768, 1024, 1199, 1200, 1440, 1920]

const guide = (page: Page, selector: string) => page.locator(`.guide-page ${selector}`)

const loaded = async (page: Page) => {
  await stubSeason(page)
  await page.goto(PATH)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const hrefs = (page: Page, selector: string) => guide(page, selector).evaluateAll((els) => els.map((el) => el.getAttribute('href')))

for (const colorScheme of ['light', 'dark'] as const) {
  test(`opens with the figures and nine chapters in order, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await loaded(page)

    await expect(page).toHaveTitle('How F1 works · Lights Out')
    await expect(guide(page, '.opening .label')).toHaveText('How F1 works · 9 chapters')
    await expect(guide(page, 'h1')).toHaveText('Read thisbefore Sunday.')
    await expect(guide(page, '.figures dd')).toHaveText(['9', '52', '2026'])
    await expect(guide(page, '.figures p')).toHaveText('Nine short chapters, 52 minutes in all. Read them in order and the next Grand Prix makes sense from the first lap.')
    expect(await hrefs(page, '.list li > a')).toEqual(CHAPTERS)
    await expect(guide(page, '.list li:first-child')).toContainText('Start here')
    await expect(guide(page, '.list li:nth-child(6)')).toContainText('A V6 and an electric motor, close to 50:50.')
    await expect(guide(page, '.opening nav a')).toHaveAttribute('href', '/chapters/race-weekend')
    await expect(guide(page, '.next .read')).toHaveAttribute('href', '/chapters/race-weekend')
    expect(errors).toEqual([])
  })
}

test('fits every width', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}`).toBeLessThanOrEqual(0)

    const out = await guide(page, 'h1, .list h2, .list p, .figures dd, .next h2').evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > innerWidth).map((el) => el.textContent))

    expect(out, `${width}`).toEqual([])
  }

  expect(errors).toEqual([])
})

test('reduced motion shows everything still', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)
  await scrollToEnd(page)

  expect(await hiddenText(page, '.term')).toEqual([])
  expect(await visibleBars(page)).toBe(0)
  expect(errors).toEqual([])
})

test('everything has arrived after a scroll to the end', async ({ page, errors }) => {
  await loaded(page)
  await scrollToEnd(page)

  expect(await hiddenText(page, '.term')).toEqual([])
  expect(errors).toEqual([])
})

test('a row shows its photo under the pointer and only there', async ({ page, errors }, testInfo) => {
  await loaded(page)

  const row = guide(page, '.list li:nth-child(4) a')

  await row.scrollIntoViewIfNeeded()

  if (testInfo.project.name === 'phone') {
    await row.dispatchEvent('pointerover', { pointerType: 'touch' })
    await expect(page.locator('.preview .card')).toBeHidden()
  } else {
    await row.hover()
    await expect(page.locator('.preview img[src="/img/ch04.jpg"]')).toBeVisible()
    await expect(row).toHaveCSS('color', 'rgb(244, 243, 239)')
    await guide(page, '.heads').hover()
    await expect(page.locator('.preview .card')).toHaveCSS('transform', 'matrix(0, 0, 0, 0, 0, 0)')
  }

  expect(errors).toEqual([])
})

test('the close keeps its caption on the photo and its credit clear', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)

  const box = async (selector: string) => {
    const b = await guide(page, selector).boundingBox()

    if (!b) throw new Error(`no ${selector}`)

    return b
  }

  const caption = await box('.next .caption')
  const credit = await box('.next .credit')
  const width = page.viewportSize()?.width ?? 0

  expect(caption.y + caption.height).toBeLessThanOrEqual(credit.y)
  expect(width - caption.x - caption.width).toBeGreaterThanOrEqual(caption.x)
  expect(errors).toEqual([])
})

const sizes = (page: Page) =>
  guide(page, 'h1, .figures, .list, .list li, .next, .next h2').evaluateAll((els) => els.map((el) => `${el.tagName} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)} ${getComputedStyle(el).fontSize}`))

test('looks the same from Home as on a direct visit', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)

  const direct = await sizes(page)

  await page.goto('/')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

  const home = await page.locator('.rows li').first().evaluate((el) => el.getBoundingClientRect().height)

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.locator('.menu nav .line > a', { hasText: 'How F1 works' }).click()
  await expect(guide(page, 'h1')).toBeVisible()
  expect(await sizes(page)).toEqual(direct)

  await page.goBack()
  await expect(page.locator('.rows li').first()).toBeVisible()
  expect(await page.locator('.rows li').first().evaluate((el) => el.getBoundingClientRect().height)).toBe(home)
  expect(errors).toEqual([])
})

test('a full load answers with the page itself', async ({ request }) => {
  const response = await request.get('/chapters/')

  expect(response.status()).toBe(200)
  expect(await response.text()).toContain('before Sunday.')
})
