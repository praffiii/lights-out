import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, scrollToEnd, stubSeason, test } from './fixtures.ts'

const PATH = '/chapters/flags'

const loaded = async (page: Page) => {
  await page.goto(PATH)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.chapter-page ${selector}`)

const poster = (page: Page, flag: string) => chapter(page, `.poster[data-flag="${flag}"]`)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText('A flag isan order.')
    await expect(page).toHaveTitle('Flags and what they mean · Lights Out')
    expect(errors).toEqual([])
  })

  test(`the posters keep their flag colours, ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(poster(page, 'blue')).toHaveCSS('background-color', 'rgb(28, 140, 255)')

    const [wall, body] = await page.evaluate(() => [getComputedStyle(document.querySelector('.wall .head') ?? document.body).backgroundColor, getComputedStyle(document.body).backgroundColor])

    expect(wall).not.toBe(body)
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

  for (const selector of ['.photo-band .credit', '.poster[data-flag="double"] .credit', '.poster[data-flag="red"] .credit', '.boards .credit', '.next .credit']) await expect(chapter(page, selector)).toContainText('CC')
})

test("six posters in race order with the season's counts", async ({ page, errors }) => {
  await loaded(page)

  const flags = await chapter(page, '.poster').evaluateAll((els) => els.map((el) => el.getAttribute('data-flag')))

  expect(flags).toEqual(['green', 'yellow', 'double', 'blue', 'red', 'chequered'])
  await expect(poster(page, 'blue').locator('.num')).toHaveText('1,287')
  await expect(poster(page, 'red').locator('.num')).toHaveText('0')
  await expect(poster(page, 'red').locator('.sub')).toContainText('26 practice, qualifying and sprint sessions')
  await expect(chapter(page, '.wall .tag')).toHaveText('OpenF1 race control · 20 races')
  await expect(chapter(page, '.wall .foot')).toContainText('Melbourne to Interlagos')
  await expect(poster(page, 'blue').locator('.chip .msg')).not.toBeEmpty()
  expect(errors).toEqual([])
})

test('track limits and boards read the tally', async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.limits .stat')).toContainText('17 of 20 black-and-white flags in 2026 races were for track limits')
  await expect(chapter(page, '.boards .stats')).toContainText('15')
  await expect(chapter(page, '.boards .stats')).toContainText('10 races in 2026')
  expect(errors).toEqual([])
})

test('with /api/season failing, no number renders and the posters still show', async ({ page, errors }) => {
  await stubSeason(page, { status: 500, body: '' })
  await loaded(page)
  await scrollToEnd(page)

  await expect(chapter(page, '.poster')).toHaveCount(6)

  for (const selector of ['.poster .count', '.poster .chip', '.poster .sub', '.limits .stat', '.boards .stats .num', '.wall .foot', '.wall .tag']) {
    const texts = await chapter(page, selector).allTextContents()

    expect(texts.join('').trim()).toBe('')
  }

  expect(await hiddenText(page)).toEqual([])
  expect(errors.filter((e) => !e.includes('500'))).toEqual([])
})

test('reduced motion leaves the posters unstacked', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)

  await expect(poster(page, 'green')).toHaveCSS('position', 'relative')
})

test('the posters stack as you scroll', async ({ page }) => {
  await loaded(page)

  await expect(poster(page, 'green')).toHaveCSS('position', 'sticky')
})

test('a word chip opens its definition', async ({ page }) => {
  await loaded(page)

  await chapter(page, '.words').getByRole('button', { name: 'Track limits', exact: true }).click()

  await expect(chapter(page, '.words > .def')).toContainText('Track limits')
})

test('a word inside a poster opens inside the poster, in its ink', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)

  const yellow = poster(page, 'yellow')
  const term = yellow.locator('.term button')

  await page.evaluate(() => {
    const list = document.querySelector('.posters')
    const first = list?.querySelector('li')

    if (list && first) window.scrollTo(0, list.getBoundingClientRect().top + scrollY + first.offsetHeight)
  })
  await page.waitForTimeout(1500)
  await term.hover()

  const def = yellow.locator('.term .def')

  await expect(def).toBeVisible()

  const [box, inside] = await Promise.all([yellow.boundingBox(), def.boundingBox()])

  expect(inside && box && inside.y >= box.y && inside.y + inside.height <= box.y + box.height).toBe(true)
  await expect(term).toHaveCSS('color', 'rgb(17, 18, 20)')
})

test('the boards link back to chapter 03', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.boards').getByRole('link', { name: /Chapter 03/ })).toHaveAttribute('href', '/chapters/tyres-and-strategy')
})
