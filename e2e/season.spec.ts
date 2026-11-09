import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, scrollToEnd, stubSeason, test, visibleBars } from './fixtures.ts'

const WAITING = 'The season data is on its way. Try again in a minute.'

const loaded = async (page: Page, path = '/season') => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const card = (page: Page) => page.locator('.calendar .card')

const tile = (page: Page, round: number) => page.locator(`.tiles .tile:nth-child(${round}) button`)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(page.locator('.title-fight .gap')).toHaveText('119')
    await expect(page.locator('.this-weekend h2')).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('after scrolling to the end no text is hidden', async ({ page, errors }) => {
  await loaded(page)
  await scrollToEnd(page)

  expect(await hiddenText(page)).toEqual([])
  expect(await visibleBars(page)).toBe(0)
  expect(errors).toEqual([])
})

test('no horizontal overflow at 390 px', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await loaded(page)

  await expect(page.locator('.who-led')).toBeAttached()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  expect(errors).toEqual([])
})

const overlaps = (page: Page, a: string, b: string) =>
  page.evaluate(
    ([x, y]) =>
      [...document.querySelectorAll(x)].some((one) =>
        [...document.querySelectorAll(y)].some((two) => {
          const p = one.getBoundingClientRect()
          const q = two.getBoundingClientRect()

          return p.left < q.right - 1 && q.left < p.right - 1 && p.top < q.bottom - 1 && q.top < p.bottom - 1
        }),
      ),
    [a, b],
  )

for (const width of [800, 1024, 1280]) {
  test(`fits at ${width} px with nothing on top of anything`, async ({ page, errors }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop')
    await page.setViewportSize({ width, height: 800 })
    await loaded(page, '/season?reduced')

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    expect(await overlaps(page, '.title-fight .gap', '.fighter')).toBe(false)
    expect(await overlaps(page, '.this-weekend .caption', '.this-weekend .sessions')).toBe(false)
    expect(await overlaps(page, '.team-row .part b', '.team-row .total b')).toBe(false)
    expect(await page.evaluate(() => [...document.querySelectorAll('.this-weekend .caption h2')].every((el) => el.scrollWidth <= el.clientWidth))).toBe(true)

    for (const round of [1, 6, 7, 8, 9, 12]) {
      await tile(page, round).hover()

      const box = await card(page).boundingBox()

      expect([round, (box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 0) <= width]).toEqual([round, true])
    }

    expect(errors).toEqual([])
  })
}

test('each page keeps its own styles across in-app navigation', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page, '/')
  await page.locator('footer a[href="/season"]').first().click()
  await page.waitForURL('**/season')
  await expect(page.locator('.who-led')).toBeVisible()

  const leaked = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.podium .is-p1 .place, .teams .who > i, .who-led .live-round > i')].flatMap((el) =>
        getComputedStyle(el).position === 'absolute' ? [`${el.parentElement?.className} > ${el.className}`] : [],
      ),
    )

  expect(await leaked()).toEqual([])

  await page.getByRole('link', { name: 'Lights Out, home' }).click()
  await page.waitForURL((url) => url.pathname === '/')

  const card = await page.evaluate(() => {
    const el = document.querySelector('.preview .card')

    return el ? [getComputedStyle(el).top, getComputedStyle(el).width] : []
  })

  expect(card).toEqual(['0px', '300px'])
  expect(errors).toEqual([])
})

test('the weekend title stays on one line when the band has room', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page, '/season?reduced')

  const lines = await page.locator('.this-weekend .caption h2').evaluate((el) => Math.round(el.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(el).lineHeight)))

  expect(lines).toBe(1)
  expect(errors).toEqual([])
})

test('?reduced shows everything with no bars', async ({ page, errors }) => {
  await page.goto('/season?reduced')
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.who-led .stint')).toHaveCount(2)
  expect(await hiddenText(page)).toEqual([])
  expect(await visibleBars(page)).toBe(0)
  expect(errors).toEqual([])
})

test('a 503 shows the waiting line within the loader budget', async ({ page, errors }) => {
  await stubSeason(page, { status: 503, body: JSON.stringify({ status: 'warming' }) })
  await loaded(page)

  await expect(page.getByText(WAITING)).toBeVisible()
  expect(errors.filter((e) => !e.includes('503'))).toEqual([])
})

test('a hung /api/season is aborted at 8 s', async ({ page }) => {
  await page.route('**/api/season', () => undefined)

  const failed = page.waitForEvent('requestfailed', { predicate: (request) => request.url().includes('/api/season'), timeout: 9_000 })

  await page.goto('/season')
  await failed
  await expect(page.getByText(WAITING)).toBeVisible()
})

test('hovering round 13 shows the Monza card', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)
  await tile(page, 13).hover()

  await expect(card(page)).toContainText('R13 · Italian Grand Prix')
  await expect(card(page)).toContainText('Monza · 5.793 km · 53 laps')
  expect(errors).toEqual([])
})

test('the hover card sits above the tiles next to it', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)
  await page.locator('.tiles').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)
  await tile(page, 5).hover()
  await expect(card(page)).toBeVisible()

  const covered = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.calendar .card')

    if (!el) return ['no card']

    el.style.pointerEvents = 'auto'

    for (const animation of el.getAnimations()) animation.finish()

    const box = el.getBoundingClientRect()

    return [0.25, 0.5, 0.75].flatMap((x) =>
      [0.3, 0.6, 0.9].flatMap((y) => {
        const top = document.elementFromPoint(box.left + box.width * x, box.top + box.height * y)

        return top?.closest('.card') ? [] : [`${x},${y}: ${top?.tagName} ${top?.getAttribute('src') ?? ''}`]
      }),
    )
  })

  expect(covered).toEqual([])
  expect(errors).toEqual([])
})

test('hovering a leader-strip column shows its lead in a whole chip', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)

  const strip = page.locator('.who-led .lead-strip')

  await strip.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)

  const box = await strip.boundingBox()

  await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) * (9.5 / 23), (box?.y ?? 0) + 100)

  const chip = page.locator('.who-led .lead-chip')

  await expect(chip).toHaveText('R10 · +45')
  expect((await chip.boundingBox())?.height).toBeGreaterThanOrEqual(20)
  expect(errors).toEqual([])
})

test('calendar tiles do not look like links while they go nowhere', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)

  expect(await tile(page, 13).evaluate((el) => getComputedStyle(el).cursor)).toBe('default')
  expect(errors).toEqual([])
})

test('Tab + Escape drive the card', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)
  await tile(page, 12).focus()
  await page.keyboard.press('Tab')

  await expect(tile(page, 13)).toBeFocused()
  await expect(card(page)).toContainText('R13 · Italian Grand Prix')
  await page.keyboard.press('Escape')
  await expect(card(page)).toHaveCount(0)
  expect(errors).toEqual([])
})

test('tapping a tile toggles its card', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await loaded(page)
  await tile(page, 13).tap()

  await expect(card(page)).toContainText('R13 · Italian Grand Prix')
  await tile(page, 13).tap()
  await expect(card(page)).toHaveCount(0)
  expect(errors).toEqual([])
})

test('the sessions card counts down', async ({ page, errors }) => {
  await loaded(page)

  const next = page.locator('.this-weekend .is-next .status')
  const before = await next.textContent()

  await page.clock.fastForward(60_000)
  await expect(next).not.toHaveText(before ?? '')
  expect(errors).toEqual([])
})
