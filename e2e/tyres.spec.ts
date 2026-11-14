import type { Page } from '@playwright/test'

import { expect, LOADER_MS, test } from './fixtures.ts'

const PATH = '/chapters/tyres-and-strategy'

const loaded = async (page: Page, path = PATH) => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.chapter-page ${selector}`)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText('A race is wonin the pit lane.')
    await expect(page).toHaveTitle('Tyres and strategy · Lights Out')
    expect(errors).toEqual([])
  })
}

test('no horizontal overflow on the page', async ({ page, errors }) => {
  await loaded(page)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  expect(overflow).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})

test('every photo is credited', async ({ page }) => {
  await loaded(page)

  for (const selector of ['.photo-band .credit', '.tyres .credit', '.cards + .credit', '.cheap .credit', '.next .credit']) await expect(chapter(page, selector)).toContainText('CC')
})

test('five compounds, three dry and two wet', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.compounds li')).toHaveCount(5)
  await expect(chapter(page, '.compounds .tag')).toHaveText(['Dry', 'Dry', 'Dry', 'Wet', 'Wet'])
})

test('pit loss is labelled an estimate', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.cost .source')).toContainText('MultiViewer estimate')
  await expect(chapter(page, '.cheap .stats')).toContainText('12.7 s')
})

test('the payoff is true to the race', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.ways .payoff')).toContainText('Antonelli got ahead of Norris without passing him on track.')
})

test('a word chip opens its definition', async ({ page }) => {
  await loaded(page)

  await chapter(page, '.words').getByRole('button', { name: 'Undercut', exact: true }).click()

  await expect(chapter(page, '.words > .def')).toContainText('Undercut')
})

test('the hero nav leads to chapters 02 and 04', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.opening').getByRole('link', { name: /02 How overtaking works/ })).toHaveAttribute('href', '/chapters/overtaking')
  await expect(chapter(page, '.opening').getByRole('link', { name: /04 Flags and what they mean/ })).toHaveAttribute('href', '/chapters/flags')
})

test('the next card leads to chapter 04', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.next .read')).toHaveAttribute('href', '/chapters/flags')
})

const replay = (page: Page, selector = '') => page.locator(`.chapter-page .replay ${selector}`.trim())

const slider = (page: Page) => replay(page, '[role="slider"]')

const now = async (page: Page) => Number(await slider(page).getAttribute('aria-valuenow'))

const pos = async (page: Page, car: 'early' | 'late') => Number(await replay(page, `tr[data-car="${car}"] [data-pos]`).textContent())

const pinSpan = (page: Page) =>
  page.evaluate(() => {
    const spacer = document.querySelector('.replay .pin-spacer')
    const top = (spacer?.getBoundingClientRect().top ?? 0) + scrollY

    return { top, range: (spacer?.getBoundingClientRect().height ?? 0) - innerHeight }
  })

const scrollTo = (page: Page, y: number) => page.evaluate((to) => window.scrollTo(0, to), y)

const NO_WEBGL = `const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return String(type).startsWith('webgl') ? null : get.call(this, type, ...rest) }`

test('the cards name both drivers and their stop laps', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.cards li')).toHaveCount(2)
  await expect(chapter(page, '.cards .chip')).toHaveText(['Boxes lap 27', 'Boxes lap 26'])
})

test('scrolling through the replay reaches step 4 with Norris behind', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)
  await replay(page).scrollIntoViewIfNeeded()

  const { top, range } = await pinSpan(page)

  await scrollTo(page, top + range)
  await expect(replay(page, '[data-step="4"]')).toHaveAttribute('data-current', '')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 4 of 4/)
  await expect.poll(async () => (await pos(page, 'late')) - (await pos(page, 'early'))).toBeGreaterThan(0)
  expect(errors).toEqual([])
})

test('keys and drag move the replay', async ({ page }) => {
  await loaded(page)
  await slider(page).focus()
  await page.keyboard.press('Home')

  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 2 of 4/)
  await page.keyboard.press('Home')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /before the first stop/)
  await page.keyboard.press('End')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 4 of 4/)

  const before = await now(page)
  const box = await slider(page).boundingBox()

  if (!box) throw new Error('the bar has no box')

  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2)
  await expect.poll(() => now(page)).not.toBe(before)
})

test('tyres change at the stop', async ({ page }) => {
  await loaded(page)
  await slider(page).focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')

  await expect(replay(page, 'tr[data-car="early"] .badge')).toHaveText('H')
  await expect(replay(page, 'tr[data-car="early"] [data-status]')).toHaveText('Out-lap')
  await expect(replay(page, 'tr[data-car="late"] [data-status]')).toHaveText('Old tyres')
})

test('reduced motion opens on step 4, unpinned', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)

  await expect(replay(page, '.pin-spacer')).toHaveCount(0)
  await expect(replay(page, '[data-step="4"]')).toHaveAttribute('data-current', '')
  expect(errors).toEqual([])
})

test('a reload inside the pin shows that moment', async ({ page }) => {
  await loaded(page)
  await replay(page).scrollIntoViewIfNeeded()

  const before = await pinSpan(page)

  await scrollTo(page, before.top + before.range * 0.6)
  await expect.poll(() => now(page)).toBeGreaterThan(0)
  await page.reload()
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
  await replay(page).scrollIntoViewIfNeeded()

  const { top, range } = await pinSpan(page)

  await scrollTo(page, top + range * 0.6)
  await expect.poll(() => now(page)).toBeGreaterThan(0)

  const text = (await slider(page).getAttribute('aria-valuetext')) ?? ''
  const step = Number(/step (\d) of 4/.exec(text)?.[1])

  await expect(replay(page, `[data-step="${step}"]`)).toHaveAttribute('data-current', '')
})

test('the HUD stays on the stage on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await loaded(page)
  await replay(page).scrollIntoViewIfNeeded()

  const { top } = await pinSpan(page)

  await scrollTo(page, top + 10)

  const pin = await replay(page, '.pin').boundingBox()

  for (const selector of ['.tower', '[role="slider"]']) {
    const box = await replay(page, selector).boundingBox()

    expect(box && pin && box.x >= pin.x && box.y >= pin.y && box.x + box.width <= pin.x + pin.width + 0.5 && box.y + box.height <= pin.y + pin.height + 0.5).toBe(true)
  }
})

test('without WebGL the replay still steps', async ({ page, errors }) => {
  await page.addInitScript({ content: NO_WEBGL })
  await loaded(page)
  await slider(page).focus()

  await expect(replay(page, '.poster')).toBeVisible()
  await page.keyboard.press('End')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 4 of 4/)
  expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([])
})

test('a drag then a scroll continue from the same moment', async ({ page }) => {
  await loaded(page)
  await slider(page).focus()
  await page.keyboard.press('Home')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /before the first stop/)

  const box = await slider(page).boundingBox()

  if (!box) throw new Error('the bar has no box')

  await page.mouse.move(box.x + 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()

  const end = Number(await slider(page).getAttribute('aria-valuemax'))

  await expect.poll(async () => (await now(page)) / end).toBeGreaterThan(0.2)

  const a = await now(page)

  await page.mouse.wheel(0, 40)
  await expect.poll(() => now(page)).toBeGreaterThanOrEqual(a)
})
