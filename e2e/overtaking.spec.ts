import type { Page } from '@playwright/test'

import { expect, LOADER_MS, test } from './fixtures.ts'

const PATH = '/chapters/overtaking'

const loaded = async (page: Page, path = PATH) => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.chapter-page ${selector}`)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText('Every pass starts longbefore the corner.')
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

  for (const selector of ['.photo-band .credit', '.frames .credit', '.air .credit', '.next .credit']) await expect(chapter(page, selector)).toContainText('CC BY')
})

test('a word chip opens its definition', async ({ page }) => {
  await loaded(page)

  await chapter(page, '.words').getByRole('button', { name: 'Overtake Mode', exact: true }).click()

  await expect(chapter(page, '.words > .def')).toContainText('Overtake Mode')
})

test('the hero nav leads back to chapter 01', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.opening').getByRole('link', { name: /01 A race weekend/ })).toHaveAttribute('href', '/chapters/race-weekend')
  await expect(chapter(page, '.opening .nav .is-soon')).toContainText('03 Tyres and strategy')
})

test('the DRS table lists three tools', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.rules tbody th')).toHaveText(['DRSUntil 2025', 'Straight mode', 'Overtake ModeNew'])
})

const replay = (page: Page, selector = '') => page.locator(`.chapter-page .replay ${selector}`.trim())

const slider = (page: Page) => replay(page, '[role="slider"]')

const now = async (page: Page) => Number(await slider(page).getAttribute('aria-valuenow'))

const pinSpan = (page: Page) =>
  page.evaluate(() => {
    const spacer = document.querySelector('.replay .pin-spacer')
    const top = (spacer?.getBoundingClientRect().top ?? 0) + scrollY

    return { top, range: (spacer?.getBoundingClientRect().height ?? 0) - innerHeight }
  })

const scrollTo = (page: Page, y: number) => page.evaluate((to) => window.scrollTo(0, to), y)

const reach = (page: Page) =>
  page.evaluate(() => {
    const line = document.querySelector('.replay .pass-hud .line')
    const r = line?.getBoundingClientRect()

    return r && r.width > 0 ? Math.hypot(r.width, r.height) : null
  })

test('the replay names the real pass', async ({ page }) => {
  await loaded(page)

  await expect(replay(page, '.who')).toContainText('São Paulo 2026 · Lap')
  await expect(replay(page, '.credit')).toContainText('Telemetry: OpenF1 (unofficial)')
})

test('scrolling through the pin lights the steps in order', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)
  await replay(page).scrollIntoViewIfNeeded()

  const { top, range } = await pinSpan(page)
  const end = Number(await slider(page).getAttribute('aria-valuemax'))
  const chaser = replay(page, '.racer[data-car="chaser"]')
  const lit: number[] = []

  await scrollTo(page, top)
  await expect.poll(() => now(page)).toBeLessThan(0.2)
  await expect(replay(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })
  await expect.poll(() => chaser.evaluate((el) => el.style.translate)).not.toBe('')

  const from = await chaser.evaluate((el) => el.style.translate)

  for (const i of [1, 2, 3, 4]) {
    await scrollTo(page, top + (range * i) / 4)
    await expect.poll(async () => Math.abs((await now(page)) - (end * i) / 4)).toBeLessThan(0.3)
    lit.push(await replay(page, '[data-step][data-lit]').count())
  }

  expect(lit).toEqual([...lit].sort((a, b) => a - b))
  expect(lit.at(-1)).toBe(4)
  expect(await chaser.evaluate((el) => el.style.translate)).not.toBe(from)
  expect(errors).toEqual([])
})

test('the slider steps with the keys', async ({ page }) => {
  await loaded(page)
  await slider(page).focus()

  await page.keyboard.press('End')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 4 of 4, Brake later/)
  await page.keyboard.press('Home')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^0\.0 s/)
  await page.keyboard.press('ArrowRight')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 1 of 4, Within one second/)
})

test('a drag then a scroll continue from the same moment', async ({ page }) => {
  await loaded(page)
  await slider(page).focus()
  await page.keyboard.press('Home')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^0\.0 s/)

  const box = await slider(page).boundingBox()

  if (!box) throw new Error('the timeline has no box')

  await page.mouse.move(box.x + 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()

  const end = Number(await slider(page).getAttribute('aria-valuemax'))

  await expect.poll(async () => (await now(page)) / end).toBeGreaterThan(0.4)

  const a = await now(page)

  await page.mouse.wheel(0, 40)
  await expect.poll(() => now(page)).toBeGreaterThanOrEqual(a)
})

test('after a reload from inside the pin, scroll still maps to time', async ({ page }) => {
  await loaded(page)
  await replay(page).scrollIntoViewIfNeeded()

  const before = await pinSpan(page)

  await scrollTo(page, before.top + before.range * 0.6)
  await expect.poll(() => now(page)).toBeGreaterThan(0)
  await page.reload()
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
  await replay(page).scrollIntoViewIfNeeded()

  const { top, range } = await pinSpan(page)
  const end = Number(await slider(page).getAttribute('aria-valuemax'))

  await scrollTo(page, top + range * 0.6)
  await expect.poll(async () => Math.abs((await now(page)) - end * 0.6)).toBeLessThan(0.3)
})

test('reduced motion opens on the last frame, unpinned', async ({ page, errors }) => {
  await loaded(page, `${PATH}?reduced`)

  await expect(replay(page, '[data-step][data-lit]')).toHaveCount(4)
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 4 of 4/)
  await expect(replay(page, '.pin-spacer')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('without WebGL the replay still steps', async ({ page, errors }) => {
  await page.addInitScript({
    content: `const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return String(type).startsWith('webgl') ? null : get.call(this, type, ...rest) }`,
  })
  await loaded(page)
  await slider(page).focus()

  await expect(replay(page, '.poster')).toBeVisible()
  await page.keyboard.press('End')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 4 of 4/)
  expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([])
})

test('the table drops Battery and footnotes Overtake Mode', async ({ page }) => {
  await loaded(page)

  await expect(replay(page, 'table')).not.toContainText('Battery')
  await expect(replay(page, '.foot')).toContainText("Teams don't publish when a driver presses it.")
})

test('the camera flies in to follow the cars and back out', async ({ page }) => {
  await loaded(page)
  await slider(page).focus()
  await page.keyboard.press('Home')
  await expect(replay(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })
  await expect.poll(() => reach(page)).toBeGreaterThan(0)

  const home = (await reach(page)) ?? 0

  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect.poll(async () => ((await reach(page)) ?? 0) / home, { timeout: 10_000 }).toBeGreaterThanOrEqual(2.5)
  await page.keyboard.press('Home')
  await expect.poll(async () => Math.abs(((await reach(page)) ?? 0) / home - 1), { timeout: 10_000 }).toBeLessThan(0.05)
})

test('each car wears its team colour', async ({ page }) => {
  await loaded(page)

  const colour = (name: string) => replay(page).evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim().toUpperCase(), name)

  expect(await colour('--chaser')).toBe('#F50537')
  expect(await colour('--leader')).toBe('#0093CC')
})

test('the replay callouts stay inside the page at tablet width', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.setViewportSize({ width: 1024, height: 768 })
  await loaded(page)
  await replay(page).scrollIntoViewIfNeeded()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  const { lowest, board } = await page.evaluate(() => ({
    lowest: Math.max(...[...document.querySelectorAll('.replay [data-step]')].map((el) => el.getBoundingClientRect().bottom)),
    board: document.querySelector('.replay .board')?.getBoundingClientRect().top ?? 0,
  }))

  expect(overflow).toBeLessThanOrEqual(0)
  expect(lowest).toBeLessThanOrEqual(board)
  expect(errors).toEqual([])
})

test('the pinned replay fits a phone with its toolbars showing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await page.setViewportSize({ width: 390, height: 664 })
  await loaded(page)
  await replay(page).scrollIntoViewIfNeeded()

  const { top } = await pinSpan(page)

  await scrollTo(page, top + 10)
  await expect.poll(() => replay(page, '.track').evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true)
})
