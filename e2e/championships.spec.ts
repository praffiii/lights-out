import { readFileSync } from 'node:fs'

import type { Page } from '@playwright/test'

import { progressAt } from '../src/chapter/pace.ts'
import { seasonPace } from '../src/titles/model.ts'
import { expect, hiddenText, LOADER_MS, pinSpan, scrollTo, scrollToEnd, stubSeason, test } from './fixtures.ts'

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

const titles2026 = JSON.parse(readFileSync('src/titles/2026.json', 'utf8'))

const snapshot = JSON.parse(readFileSync('test/fixtures/season-snapshot.json', 'utf8'))

const stage = (page: Page, selector = '') => page.locator(`.championships-page .season-race ${selector}`.trim())

const slider = (page: Page) => stage(page, '[role="slider"]')

const pace = seasonPace(titles2026)

const toRound = async (page: Page, round: number) => {
  const { top, range } = await pinSpan(page, '.season-race')
  const at = progressAt(pace, round - 1)
  const next = progressAt(pace, round)
  const target = round >= titles2026.rounds.length ? 0.995 : at + (next - at) * 0.4

  await scrollTo(page, top + range * target)
  await expect(stage(page, '[data-round]')).toHaveText(String(round))
}

const wonSides = (page: Page) => stage(page, '.side[data-won]').evaluateAll((els) => els.map((el) => el.getAttribute('data-side')))

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the stage flips the theme and fits the screen, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)
    await toRound(page, 19)

    await expect(stage(page)).toHaveAttribute('data-theme', colorScheme === 'light' ? 'dark' : 'light')

    const box = await stage(page, '.pin').boundingBox()

    expect(box?.y ?? -1).toBeCloseTo(0, 0)
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1)
    expect(errors).toEqual([])
  })
}

test('each title locks at its round and unlocks on the way back', async ({ page, errors }) => {
  await loaded(page)

  await toRound(page, 18)
  expect(await wonSides(page)).toEqual([])

  await toRound(page, 19)
  expect(await wonSides(page)).toEqual(['drivers'])

  await toRound(page, 20)
  expect(await wonSides(page)).toEqual(['drivers', 'teams'])

  await toRound(page, 18)
  expect(await wonSides(page)).toEqual([])

  await toRound(page, 21)
  expect(await wonSides(page)).toEqual(['drivers', 'teams'])

  await toRound(page, 1)
  expect(await wonSides(page)).toEqual([])
  expect(errors).toEqual([])
})

test('round 19 tells the story of Mexico City', async ({ page, isMobile }) => {
  await loaded(page)
  await toRound(page, 19)

  for (const text of ['Mexico City', 'Verstappen wins']) await expect(stage(page, '.when')).toContainText(text)

  if (!isMobile) await expect(stage(page, '.when')).toContainText('1 November')

  await expect(stage(page, '[data-side="drivers"] .lead')).toHaveText('119')
  await expect(stage(page, '[data-side="teams"] .lead')).toHaveText('126')
  await expect(stage(page, '[data-side="drivers"] .state')).toHaveText('Won · round 19')
  await expect(stage(page, '[data-side="teams"] .state')).toHaveText('Still open')

  const rows = isMobile ? 3 : 5

  for (const side of ['drivers', 'teams']) await expect(stage(page, `[data-side="${side}"] .tower li`).filter({ visible: true })).toHaveCount(rows)

  await expect(stage(page, '.split').filter({ visible: true })).toHaveCount(isMobile ? 0 : 5)
  await expect(stage(page, '[data-side="teams"] .tower li').nth(2)).toContainText('Red Bull')
  await expect(stage(page, '[data-side="drivers"] .tower li').first()).toContainText('+15')
})

test('the strip shows every round, its sprints and two tags that stay apart', async ({ page }) => {
  await loaded(page)
  await toRound(page, 21)

  await expect(stage(page, '.cells li')).toHaveCount(23)
  await expect(stage(page, '.cells li[data-done]')).toHaveCount(21)
  expect(await stage(page, '.cells li[data-sprint]').evaluateAll((els) => els.map((el) => el.getAttribute('data-n')))).toEqual(['2', '4', '5', '9', '12', '17'])

  const tags = await stage(page, '.tag').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map(({ left, right }) => ({ left, right })))

  expect(tags).toHaveLength(2)
  expect(tags[0]?.right ?? 0).toBeLessThanOrEqual(tags[1]?.left ?? 0)

  for (const { left, right } of tags) {
    expect(left).toBeGreaterThanOrEqual(0)
    expect(right).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0)
  }
})

const NINETEEN = 'Round 19 of 23, Mexico City. Drivers: Antonelli 119 ahead, 100 left, won. Constructors: Mercedes 126 ahead, 172 left, open.'

test('keys walk the season', async ({ page }) => {
  await loaded(page)
  await toRound(page, 18)
  await slider(page).focus()
  await page.keyboard.press('ArrowRight')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', NINETEEN)
  await page.keyboard.press('ArrowLeft')
  await expect(stage(page, '[data-round]')).toHaveText('18')
  await page.keyboard.press('End')
  await expect(stage(page, '[data-round]')).toHaveText('21')
  await page.keyboard.press('Home')
  await expect(stage(page, '[data-round]')).toHaveText('1')
})

test('a press on the strip goes to that round, and never past the last one', async ({ page }) => {
  await loaded(page)
  await toRound(page, 10)

  const press = async (cell: number) => {
    const box = await stage(page, '.cells').boundingBox()

    if (!box) throw new Error('no strip')

    await page.mouse.click(box.x + (box.width * (cell - 0.5)) / 23, box.y + box.height / 2)
  }

  await press(19)
  await expect(slider(page)).toHaveAttribute('aria-valuetext', NINETEEN)
  await press(23)
  await expect(stage(page, '[data-round]')).toHaveText('21')
})

const next = {
  round: 22,
  name: 'Qatar Grand Prix',
  locality: 'Lusail',
  date: '2026-11-29',
  sprint: false,
  winner: 'nocode',
  rows: [['nocode', 'newteam', 600]],
  finishes: [['nocode', 'newteam', 1]],
}

const live = {
  ...titles2026,
  drivers: { ...titles2026.drivers, nocode: { code: null, family: 'Newcomer' } },
  teams: { ...titles2026.teams, newteam: { name: 'New Team' } },
  rounds: [...titles2026.rounds, next],
  left: titles2026.left.slice(1),
}

test('a newer live season takes over, with a driver and a team the site has no picture of', async ({ page, errors }) => {
  await stubSeason(page, { status: 200, body: JSON.stringify({ ...snapshot, titles: live }) })
  await loaded(page)
  await toRoundLast(page)

  await expect(stage(page, '[data-round]')).toHaveText('22')
  await expect(stage(page, '[data-side="drivers"] .tower li').first()).toContainText('Newcomer')
  await expect(stage(page, '[data-side="teams"] .tower')).toContainText('New Team')
  expect(errors).toEqual([])
})

test('the shipped season stands in when the data fails', async ({ page }) => {
  await stubSeason(page, { status: 503, body: '{}' })
  await loaded(page)
  await toRoundLast(page)

  await expect(stage(page, '[data-round]')).toHaveText('21')
})

async function toRoundLast(page: Page) {
  const { top, range } = await pinSpan(page, '.season-race')

  await scrollTo(page, top + range * 0.995)
}

test('data that lands while the stage is pinned keeps it in step', async ({ page, errors }) => {
  let release = () => {}

  const gate = new Promise<void>((resolve) => {
    release = resolve
  })

  await page.route('**/api/season', async (route) => {
    await gate
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...snapshot, titles: live }) })
  })
  await loaded(page)
  await toRound(page, 19)
  release()
  await expect(stage(page, '.cells li[data-done]')).toHaveCount(22)
  await toRoundLast(page)
  await expect(stage(page, '[data-round]')).toHaveText('22')
  expect(errors).toEqual([])
})
