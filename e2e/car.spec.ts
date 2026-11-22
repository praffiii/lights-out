import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, scrollToEnd, stubSeason, test } from './fixtures.ts'

const PATH = '/chapters/inside-the-car'

const loaded = async (page: Page) => {
  await page.goto(PATH)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.chapter-page ${selector}`)

const FACTS = ['2 flaps', 'Carbon tub', 'Titanium', 'Radiators', 'Most grip', '350 kW', 'Flap opens', '18 in']

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText('Eight parts.One car.')
    await expect(page).toHaveTitle('Inside the car · Lights Out')
    expect(errors).toEqual([])
  })

  test(`the take-apart band sits in the opposite theme, ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    const [band, body] = await page.evaluate(() => [getComputedStyle(document.querySelector('.apart') ?? document.body).backgroundColor, getComputedStyle(document.body).backgroundColor])

    expect(band).not.toBe(body)
  })
}

test('no horizontal overflow on the page', async ({ page, errors }) => {
  await loaded(page)
  await scrollToEnd(page)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  expect(overflow).toBeLessThanOrEqual(0)
  expect(await hiddenText(page)).toEqual([])
  expect(errors).toEqual([])
})

test('every photo and the 3D car are credited', async ({ page }) => {
  await loaded(page)

  for (const selector of ['.photo-band .credit', '.history figure:nth-child(1) .credit', '.history figure:nth-child(2) .credit', '.history figure:nth-child(3) .credit', '.next .credit']) await expect(chapter(page, selector)).toContainText(/CC|Public domain/)
  await expect(chapter(page, '.apart-credit')).toHaveText("3D car by MaG80 · CC BY 4.0 · a fan design to the 2026 rules, not any team's car · front and rear wing flaps move")
})

test('the band lists the eight parts with their facts', async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.parts li')).toHaveCount(8)
  expect(await chapter(page, '.parts .fact').allTextContents()).toEqual(FACTS)
  expect(errors).toEqual([])
})

test("the wings read the season's top speed", async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.speed .num')).toHaveText('361')
  await expect(chapter(page, '.speed .unit')).toHaveText('km/h')
  await expect(chapter(page, '.speed .line')).toHaveText('Car 10, Gasly, through the Mexico City speed trap on lap 48. Flaps open.')
  await expect(chapter(page, '.speed .label')).toHaveText('Top speed, 2026')
  expect(errors).toEqual([])
})

test('with /api/season failing, no number renders and the car still shows', async ({ page, errors }) => {
  await stubSeason(page, { status: 500, body: '' })
  await loaded(page)
  await scrollToEnd(page)

  for (const selector of ['.speed .num', '.speed .line', '.speed .label']) expect((await chapter(page, selector).allTextContents()).join('').trim()).toBe('')
  await expect(chapter(page, '.wings .stage img')).toBeVisible()
  expect(errors.filter((e) => !e.includes('500'))).toEqual([])
})

test('a wing tab switches the mode', async ({ page }) => {
  await loaded(page)

  await chapter(page, '.wings [role="tab"]').first().click()
  await expect(chapter(page, '.wings [role="tab"]').first()).toHaveAttribute('aria-selected', 'true')
})

test('the Next band leads to chapter 06', async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.next .caption > p')).toHaveText('Next · Chapter 06 · 6 min')
  await expect(chapter(page, '.next h2')).toHaveText('The power unit.')
  await expect(chapter(page, '.next .read')).toHaveAttribute('href', '/chapters/power-unit')
  expect(errors).toEqual([])
})

test('the hero leads back to chapter 04 and on to chapter 06', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.opening').getByRole('link', { name: /04 Flags and what they mean/ })).toHaveAttribute('href', '/chapters/flags')
  await expect(chapter(page, '.opening').getByRole('link', { name: /06 The power unit/ })).toHaveAttribute('href', '/chapters/power-unit')
})

test('chapter 04 leads here', async ({ page }) => {
  await page.goto('/chapters/flags')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

  await expect(chapter(page, '.opening').getByRole('link', { name: /05 Inside the car/ })).toHaveAttribute('href', PATH)
  await expect(chapter(page, '.next .read')).toHaveAttribute('href', PATH)
})

const NO_WEBGL = `const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return String(type).startsWith('webgl') ? null : get.call(this, type, ...rest) }`

const band = (page: Page, selector = '') => page.locator(`.chapter-page .apart ${selector}`.trim())

const row = (page: Page, n: number) => band(page, `.parts li:nth-child(${n}) .row`)

test('the band draws the live car once it is near', async ({ page, errors }) => {
  await loaded(page)
  await band(page).scrollIntoViewIfNeeded()

  await expect(band(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })
  await expect(band(page, '.stage canvas')).toBeVisible()
  expect(errors).toEqual([])
})

test('arriving from chapter 04 the pinned band fits the screen', async ({ page, errors }) => {
  await page.goto('/chapters/flags')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
  await chapter(page, '.opening').getByRole('link', { name: /05 Inside the car/ }).click()
  await expect(chapter(page, 'h1')).toHaveText('Eight parts.One car.')

  const top = await band(page).evaluate((el) => el.getBoundingClientRect().top + scrollY)

  await page.evaluate((y) => window.scrollTo(0, y + innerHeight), top)
  await expect.poll(() => band(page, '.foot').evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true)
  expect(errors).toEqual([])
})

test('the part tags stay inside the page before the band is reached', async ({ page, errors }) => {
  await loaded(page)
  await expect(band(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })

  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})

test('a row takes the car to its part', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)
  await band(page).scrollIntoViewIfNeeded()

  await row(page, 6).click()
  await expect(row(page, 6)).toHaveAttribute('aria-expanded', 'true')
  await expect(band(page, '.count')).toHaveText('Part 06 of 08')

  await row(page, 2).click()
  await expect(band(page, '.count')).toHaveText('Part 02 of 08')
  await expect(band(page, '.row[aria-expanded="true"]')).toHaveCount(1)
  await expect(band(page, '[role="slider"]')).toHaveAttribute('aria-valuetext', 'Part 02 of 08 · Survival cell')
  expect(errors).toEqual([])
})

test('arrow keys walk the rows and keep focus when only the active row shows', async ({ page, errors }) => {
  await page.setViewportSize({ width: 1000, height: 830 })
  await loaded(page)
  await band(page).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY))
  await row(page, 1).click()
  await expect(band(page, '.count')).toHaveText('Part 01 of 08')

  await page.keyboard.press('ArrowDown')
  await expect(band(page, '.count')).toHaveText('Part 02 of 08')
  await expect(row(page, 2)).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(band(page, '.count')).toHaveText('Part 03 of 08')
  await expect(row(page, 3)).toBeFocused()
  expect(errors).toEqual([])
})

test('the ground shadow fades out before the edge of the 3D layer', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await loaded(page)
  await band(page).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY))
  await expect(band(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })
  await row(page, 7).click()
  await expect(band(page, '.count')).toHaveText('Part 07 of 08')
  await page.evaluate(() => document.querySelector<HTMLElement>(':focus')?.blur())
  await page.waitForTimeout(1500)

  const box = await band(page, '.gl').boundingBox()
  const list = await band(page, '.parts').boundingBox()
  const foot = await band(page, '.foot').boundingBox()
  const x = Math.round(box?.x ?? 0)
  const from = Math.round((list?.y ?? 0) + (list?.height ?? 0) + 4)
  const to = Math.round(Math.min((box?.y ?? 0) + (box?.height ?? 0), foot?.y ?? 0) - 4)

  expect(to - from).toBeGreaterThan(20)

  const shot = await page.screenshot({ clip: { x: x - 4, y: from, width: 8, height: to - from } })

  const step = await page.evaluate(async (png) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob())
    const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d')

    if (!ctx) return 255

    ctx.drawImage(bitmap, 0, 0)

    const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    const lum = (px: number, y: number) => data[(y * width + px) * 4] ?? 0
    let worst = 0

    for (let y = 0; y < height; y++) worst = Math.max(worst, Math.abs(lum(0, y) - lum(width - 1, y)))

    return worst
  }, shot.toString('base64'))

  expect(step).toBeLessThanOrEqual(2)
})

test('the band follows a theme switch and keeps drawing', async ({ page, errors }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await loaded(page)
  await band(page).scrollIntoViewIfNeeded()
  await expect(band(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })

  const before = await band(page).evaluate((el) => getComputedStyle(el).backgroundColor)

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => band(page).evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before)
  await expect(band(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })
  await expect(band(page, '.stage canvas')).toBeVisible()
  expect(errors).toEqual([])
})

test('without WebGL the poster shows and the rows still work', async ({ page, errors }, testInfo) => {
  await page.addInitScript({ content: NO_WEBGL })
  await loaded(page)
  await band(page).scrollIntoViewIfNeeded()

  await expect(band(page, '.stage picture img')).toBeVisible()
  await band(page, '[role="slider"]').focus()
  await page.keyboard.press('End')
  await expect(band(page, '.count')).toHaveText('Part 08 of 08')

  if (testInfo.project.name === 'desktop') {
    await row(page, 3).click()
    await expect(band(page, '.count')).toHaveText('Part 03 of 08')
  }

  expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([])
})

test('reduced motion keeps the band still with every job open', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)

  await expect(band(page, '.pin-spacer')).toHaveCount(0)
  await expect(band(page, 'canvas')).toHaveCount(0)

  for (const job of await band(page, '.job').all()) await expect(job).toBeVisible()
  expect(errors).toEqual([])
})

const wings = (page: Page, selector = '') => page.locator(`.chapter-page .wings ${selector}`.trim())

const tab = (page: Page, name: RegExp) => wings(page).getByRole('tab', { name })

const placeStage = (page: Page, at: 'before' | 'after') =>
  wings(page, '.stage').evaluate((el, where) => {
    const r = el.getBoundingClientRect()
    const y = r.top + scrollY

    window.scrollTo(0, where === 'before' ? y - innerHeight * 0.98 : y + r.height - innerHeight * 0.05)
  }, at)

test('scrolling through the wings opens the flaps', async ({ page, errors }) => {
  await loaded(page)
  await wings(page).scrollIntoViewIfNeeded()
  await expect(wings(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })

  await placeStage(page, 'before')
  await expect(tab(page, /Corner Mode/)).toHaveAttribute('aria-selected', 'true')

  await placeStage(page, 'after')
  await expect(tab(page, /Straight Mode/)).toHaveAttribute('aria-selected', 'true')
  expect(errors).toEqual([])
})

test('a wing tab sets the mode', async ({ page, errors }) => {
  await loaded(page)
  await wings(page).scrollIntoViewIfNeeded()

  await tab(page, /Corner Mode/).click()
  await expect(tab(page, /Corner Mode/)).toHaveAttribute('aria-selected', 'true')
  await expect(tab(page, /Straight Mode/)).toHaveAttribute('aria-selected', 'false')
  expect(errors).toEqual([])
})

test('reduced motion opens on Straight Mode with the poster', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)

  await expect(tab(page, /Straight Mode/)).toHaveAttribute('aria-selected', 'true')
  await expect(wings(page, 'canvas')).toHaveCount(0)
  await expect(wings(page, '.stage img')).toBeVisible()
  expect(errors).toEqual([])
})
