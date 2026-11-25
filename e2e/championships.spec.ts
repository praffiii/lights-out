import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, scrollToEnd, test } from './fixtures.ts'

const PATH = '/chapters/championships'

const loaded = async (page: Page, path = PATH) => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.championships-page ${selector}`)

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

const numbers = (page: Page, selector: string) => chapter(page, selector).evaluateAll((els) => els.map((el) => (el instanceof HTMLElement ? (el.dataset.text ?? el.textContent) : '')))

const CHIPS = ['Points', 'Sprint', "Drivers' title", "Constructors' title", 'Constructors', 'Teammate', 'Countback', 'Budget cap', 'Wind tunnel', 'Fastest lap · until 2024']

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText('Two titles.One set of points.')
    await expect(page).toHaveTitle('The two championships · Lights Out')
    await expect(chapter(page, '.opening .label')).toHaveText('How F1 works · Chapter 08 · 6 min')
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    expect(errors).toEqual([])
  })
}

test('nothing overflows, nothing stays hidden and every credit is filled', async ({ page, errors }) => {
  await loaded(page)
  await scrollToEnd(page)

  expect(await overflow(page)).toBeLessThanOrEqual(0)
  expect(await hiddenText(page)).toEqual([])

  for (const text of await chapter(page, '.credit').allTextContents()) expect(text.trim()).not.toBe('')
  expect(errors).toEqual([])
})

for (const width of [360, 768, 1024]) {
  test(`does not scroll sideways at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await loaded(page)
    await scrollToEnd(page)

    expect(await overflow(page)).toBeLessThanOrEqual(0)

    const right = await chapter(page, ':is(.scores, .sum, .cap) .num').evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().right)))

    expect(right).toBeLessThanOrEqual(width)
  })
}

test('the points run from 25 to 1, with this season’s sprints', async ({ page }) => {
  await loaded(page)

  expect(await numbers(page, '.scores .num')).toEqual(['25', '18', '15', '12', '10', '8', '6', '4', '2', '1'])
  await expect(chapter(page, '.scores .extra li')).toHaveCount(2)
  await expect(chapter(page, '.scores .extra li').first()).toContainText('6 weekends in 2026')
})

test('the champions add up to their team', async ({ page }) => {
  await loaded(page)
  await scrollToEnd(page)

  expect(await numbers(page, '.sum .num')).toEqual(['402', '264', '666'])
  await expect(chapter(page, '.sum h2')).toHaveText('Both titles.One team.')
  await expect(chapter(page, '.sum .body')).toHaveText("Antonelli won the drivers' title at Mexico City. Mercedes won the teams' title one race later, at São Paulo. It took both cars.")
})

test('the budget cap names its number and who went over', async ({ page }) => {
  await loaded(page)
  await scrollToEnd(page)

  await expect(chapter(page, '.cap .num')).toHaveText('$215m')
  await expect(chapter(page, '.cap .payoff')).toContainText('Over the cap')
  await expect(chapter(page, '.cap .payoff')).toContainText('Red Bull, 2021: £1.86m over. A $7m fine and 10% less wind tunnel time for a year.', { useInnerText: true })
})

test('the words run in order', async ({ page }) => {
  await loaded(page)

  expect(await chapter(page, '.words .chips button').allTextContents()).toEqual(CHIPS)
})

test('every term opens in full above its neighbours', async ({ page }, testInfo) => {
  await loaded(page)

  const terms = chapter(page, '.term')

  await expect(terms).toHaveCount(3)

  for (let i = 0; i < 3; i++) {
    const term = terms.nth(i)
    const button = term.locator('button')

    await button.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(1500)

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

test('it links back to 07 and 09 waits', async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.opening nav').getByRole('link', { name: /07 Defending/ })).toHaveAttribute('href', '/chapters/defending')
  await expect(chapter(page, '.opening nav .is-soon')).toContainText('09 DRS, 2011 to 2025')
  await expect(chapter(page, '.next .caption > p')).toHaveText('Next · Chapter 09 · 5 min')
  await expect(chapter(page, '.next a')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('Home and Chapter 07 lead here', async ({ page, errors }) => {
  await page.goto('/')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
  await expect(page.locator('.chapters .head')).toContainText('Eight chapters · 47 min')
  await expect(page.locator('.rows li:nth-child(8) a')).toHaveAttribute('href', PATH)

  await loaded(page, '/chapters/defending')
  await expect(page.locator('.chapter-page .opening nav').getByRole('link', { name: /08 The two championships/ })).toHaveAttribute('href', PATH)
  await expect(page.locator('.chapter-page .next .read')).toHaveAttribute('href', PATH)
  expect(errors).toEqual([])
})
