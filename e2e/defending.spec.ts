import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, scrollToEnd, test } from './fixtures.ts'

const PATH = '/chapters/defending'

const loaded = async (page: Page, path = PATH) => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.chapter-page ${selector}`)

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

const CHIPS = ['Defending', 'Racing line', 'Switchback', 'Divebomb', 'Apex', 'Braking zone', "Car's width", 'Track limits', 'Black-and-white flag', 'Stewards', 'Penalty points', 'Drive-through']

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText("One move to defend.Then it's a race.")
    await expect(page).toHaveTitle('Defending · Lights Out')
    expect(errors).toEqual([])
  })

  test(`both stills follow the theme, ${colorScheme}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    const phone = testInfo.project.name === 'phone' ? '-phone' : ''
    const shown = (selector: string) => chapter(page, selector).evaluate((el) => (el instanceof HTMLImageElement ? el.currentSrc : ''))

    for (const [selector, view] of [
      ['.reply .art img', 'switch'],
      ['.divebomb .art img', 'dive'],
    ] as const) {
      await chapter(page, selector).scrollIntoViewIfNeeded()
      await expect.poll(() => shown(selector)).toContain(`/defend/${view}${phone}-${colorScheme}.webp`)
      await expect(chapter(page, selector)).toHaveAttribute('alt', /\w{4}/)
    }
  })
}

test('the stills swap when the theme is toggled', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await loaded(page)
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click()

  await expect.poll(() => chapter(page, '.divebomb .art img').evaluate((el) => (el instanceof HTMLImageElement ? el.src : ''))).toContain('-dark.webp')
})

test('nothing overflows, nothing stays hidden and every credit is filled', async ({ page, errors }) => {
  await loaded(page)
  await scrollToEnd(page)

  expect(await overflow(page)).toBeLessThanOrEqual(0)
  expect(await hiddenText(page)).toEqual([])

  for (const text of await chapter(page, '.credit').allTextContents()) expect(text.trim()).not.toBe('')
  expect(errors).toEqual([])
})

test('a 360 px phone does not overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await page.setViewportSize({ width: 360, height: 780 })
  await loaded(page)
  await scrollToEnd(page)

  expect(await overflow(page)).toBeLessThanOrEqual(0)

  const right = await chapter(page, '.price .num').evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().right)))

  expect(right).toBeLessThanOrEqual(360)
})

test('the rule ends in a purple payoff and the price in twelve points', async ({ page }) => {
  await loaded(page)
  await scrollToEnd(page)

  await expect(chapter(page, '.rule .rows li')).toHaveCount(3)
  await expect(chapter(page, '.rule .rows li').nth(2)).toHaveClass(/payoff/)
  await expect(chapter(page, '.rule .payoff .what')).toHaveText('A second move. Or any swerve after the brakes go on.')
  expect(await chapter(page, '.price .num').evaluateAll((els) => els.map((el) => (el instanceof HTMLElement ? (el.dataset.text ?? el.textContent) : '')))).toEqual(['5', '10', '12'])
})

test('the words run in order', async ({ page }) => {
  await loaded(page)

  expect(await chapter(page, '.words .chips button').allTextContents()).toEqual(CHIPS)
})

test('the switchback chips stay apart and on screen', async ({ page }, testInfo) => {
  await loaded(page)
  await scrollToEnd(page)

  const boxes = await chapter(page, '.reply .mark b').evaluateAll((els) =>
    els.flatMap((el) => {
      const r = el.getBoundingClientRect()

      return r.width > 0 ? [{ left: r.left, right: r.right, top: r.top, bottom: r.bottom }] : []
    }),
  )

  expect(boxes.length).toBe(testInfo.project.name === 'phone' ? 2 : 4)

  const width = page.viewportSize()?.width ?? 0

  for (const [i, a] of boxes.entries()) {
    expect(a.left).toBeGreaterThanOrEqual(0)
    expect(a.right).toBeLessThanOrEqual(width)

    for (const b of boxes.slice(i + 1)) expect(a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom).toBe(false)
  }
})

test('every term opens in full above its neighbours', async ({ page }, testInfo) => {
  await loaded(page)

  const terms = chapter(page, '.term')
  const n = await terms.count()

  expect(n).toBe(6)

  for (let i = 0; i < n; i++) {
    const term = terms.nth(i)
    const button = term.locator('button')

    await button.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(1200)

    if (testInfo.project.name === 'phone') await button.tap()
    else await button.hover()

    await expect(term.locator('.def')).toBeVisible()

    const covered = await term.locator('.def').evaluate((el) => {
      el.style.pointerEvents = 'auto'

      const r = el.getBoundingClientRect()
      const top = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2)

      return !(top !== null && el.contains(top))
    })

    expect(covered).toBe(false)
    await page.mouse.move(2, 2)

    if (testInfo.project.name === 'phone') await button.tap()
  }
})

test('it links back to 06 and 08 waits', async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.opening nav').getByRole('link', { name: /06 The power unit/ })).toHaveAttribute('href', '/chapters/power-unit')
  await expect(chapter(page, '.opening nav .is-soon')).toContainText('08 The two championships')
  await expect(chapter(page, '.next .caption > p')).toHaveText('Next · Chapter 08 · 6 min')
  await expect(chapter(page, '.next .is-soon')).toContainText('Soon')
  await expect(chapter(page, '.next a')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('reduced motion hides nothing', async ({ page, errors }) => {
  await loaded(page, `${PATH}?reduced`)

  expect(await hiddenText(page)).toEqual([])
  expect(errors).toEqual([])
})
