import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, NO_WEBGL, pinSpan, scrollTo, scrollToEnd, test } from './fixtures.ts'

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
  expect(await hiddenText(page, '.fight')).toEqual([])

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

test('it links back to 06 and on to 08', async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.opening nav').getByRole('link', { name: /06 The power unit/ })).toHaveAttribute('href', '/chapters/power-unit')
  await expect(chapter(page, '.opening nav').getByRole('link', { name: /08 The two championships/ })).toHaveAttribute('href', '/chapters/championships')
  await expect(chapter(page, '.next .caption > p')).toHaveText('Next · Chapter 08 · 6 min')
  await expect(chapter(page, '.next .read')).toHaveAttribute('href', '/chapters/championships')
  expect(errors).toEqual([])
})

test('reduced motion hides nothing', async ({ page, errors }) => {
  await loaded(page, `${PATH}?reduced`)

  expect(await hiddenText(page, '.fight .stage')).toEqual([])
  expect(errors).toEqual([])
})

const fight = (page: Page, selector = '') => page.locator(`.chapter-page .fight ${selector}`.trim())

const slider = (page: Page) => fight(page, '[role="slider"]')

const now = async (page: Page) => Number(await slider(page).getAttribute('aria-valuenow'))

const order = (page: Page) => fight(page, '.board tbody th').allTextContents()

const seekKeys = async (page: Page, key: string) => {
  await slider(page).focus()
  await page.keyboard.press(key)
}

test('the fight names the real laps, the headline and its sources', async ({ page, errors }) => {
  await loaded(page)

  await expect(fight(page, '.title .label')).toHaveText('Replay · Albert Park · Laps 8 to 9')
  await expect(fight(page, 'h2')).toHaveText('Four lead changes.Eighty seconds.')
  await expect(fight(page, '.title .intro')).toContainText('Australia 2026')
  await expect(fight(page, '.credit')).toContainText('Telemetry: OpenF1 (unofficial)')
  await expect(fight(page, '.credit')).toContainText('Lock-up: race reports')
  expect((await fight(page).textContent())?.toLowerCase()).not.toContain('inside')
  expect(errors).toEqual([])
})

test('scrolling lights the steps and swaps the board, forward and back', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)
  await fight(page).scrollIntoViewIfNeeded()

  const { top, range } = await pinSpan(page, '.fight')

  for (const [at, lit, leader] of [
    [0.1, 0, 'LEC'],
    [0.205, 1, 'RUS'],
    [0.405, 2, 'LEC'],
    [0.605, 3, 'RUS'],
    [0.805, 4, 'LEC'],
    [1, 4, 'LEC'],
    [0.3, 1, 'RUS'],
    [0, 0, 'LEC'],
  ] as const) {
    await scrollTo(page, top + range * at)
    await expect(fight(page, '[data-step][data-lit]')).toHaveCount(lit)
    await expect.poll(async () => (await order(page))[0]).toBe(leader)
    await expect(fight(page, '.board tbody tr').first().locator('[data-gap]')).toHaveText('Leader')
  }

  expect(errors).toEqual([])
})

test('the bar keeps true time under the pointer', async ({ page }) => {
  await loaded(page)
  await slider(page).scrollIntoViewIfNeeded()
  await seekKeys(page, 'Home')
  await expect.poll(() => now(page)).toBeLessThan(0.2)

  for (const f of [0.5, 0.1]) {
    const box = await slider(page).boundingBox()

    if (!box) throw new Error('the bar has no box')

    await page.mouse.click(box.x + box.width * f, box.y + box.height / 2)
    await expect.poll(async () => Math.abs((await now(page)) - 96 * f)).toBeLessThan(1)
  }
})

test('the keys step through the changes', async ({ page }) => {
  await loaded(page)
  await seekKeys(page, 'End')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 4 of 4, The cut-back, Leclerc leads/)
  await seekKeys(page, 'Home')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^0\.0 s, before the first change, Leclerc leads/)
  await seekKeys(page, 'ArrowRight')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 1 of 4, Russell dives, Russell leads/)
})

test('the bar draws five stretches to scale and four pins that stay apart', async ({ page }, testInfo) => {
  for (const width of testInfo.project.name === 'phone' ? [390, 360] : [1470, 1024]) {
    await page.setViewportSize({ width, height: testInfo.project.name === 'phone' ? 780 : 830 })
    await loaded(page)

    const bar = await slider(page).boundingBox()
    const parts = await fight(page, '.stretch-of').evaluateAll((els) => els.map((el) => ({ share: Number(el.getAttribute('data-share')), width: el.getBoundingClientRect().width })))

    expect(parts.length).toBe(5)
    expect(parts.reduce((s, p) => s + p.share, 0)).toBeCloseTo(1, 5)

    for (const p of parts) expect(Math.abs(p.width / (bar?.width ?? 1) - p.share)).toBeLessThan(0.01)

    const pins = await fight(page, '.marks b').evaluateAll((els) => els.map((el) => ({ n: el.textContent, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })))

    expect(pins.map((p) => p.n)).toEqual(['1', '2', '3', '4'])

    for (const [i, p] of pins.entries()) expect(p.left).toBeGreaterThanOrEqual(pins[i - 1]?.right ?? 0)
    expect(pins.at(-1)?.right ?? Infinity).toBeLessThanOrEqual(width)
  }
})

test('the HUD stays on the stage and inside the screen', async ({ page }, testInfo) => {
  for (const [width, height] of testInfo.project.name === 'phone' ? ([[390, 844], [360, 740]] as const) : ([[1470, 830], [1024, 768]] as const)) {
    await page.setViewportSize({ width, height })
    await loaded(page)
    await seekKeys(page, 'End')
    await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 4/)

    const pin = await fight(page, '.pin').boundingBox()

    expect(Math.abs((pin?.height ?? 0) - height)).toBeLessThan(2)

    const boxes = []

    for (const selector of ['.board', '.chyron li[data-current]', '[role="slider"]', '.marks']) {
      const b = await fight(page, selector).boundingBox()

      if (!b) throw new Error(`${selector} has no box`)

      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width).toBeLessThanOrEqual(width + 0.5)
      expect(b.y).toBeGreaterThanOrEqual((pin?.y ?? 0) - 0.5)
      expect(b.y + b.height).toBeLessThanOrEqual((pin?.y ?? 0) + height + 0.5)
      boxes.push(b)
    }

    const [board, card, bar] = boxes

    expect((card?.y ?? 0) + (card?.height ?? 0)).toBeLessThanOrEqual((board?.y ?? 0) + 0.5)
    expect((board?.y ?? 0) + (board?.height ?? 0)).toBeLessThanOrEqual((bar?.y ?? 0) + 0.5)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
  }
})

test('crossing the line never makes a car jump', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)
  await seekKeys(page, 'End')
  await expect(fight(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })

  const bar = await slider(page).boundingBox()

  if (!bar) throw new Error('the bar has no box')

  const car = fight(page, '.racer[data-car="LEC"]')
  const at = () => car.evaluate((el) => el.style.translate.split(' ').map(parseFloat))
  const spots: number[][] = []

  for (let t = 85; t <= 87; t += 0.5) {
    await page.mouse.click(bar.x + (bar.width * t) / 96, bar.y + bar.height / 2)
    await expect.poll(async () => Math.abs((await now(page)) - t)).toBeLessThan(0.2)
    await page.waitForTimeout(700)
    spots.push(await at())
  }

  for (const [i, p] of spots.entries()) {
    const q = spots[i - 1]

    if (q) expect(Math.hypot((p[0] ?? 0) - (q[0] ?? 0), (p[1] ?? 0) - (q[1] ?? 0))).toBeLessThan(200)
  }
})

test('reduced motion rests on the last frame, unpinned, with every step listed', async ({ page, errors }) => {
  await loaded(page, `${PATH}?reduced`)

  await expect(fight(page, '[data-step][data-lit]')).toHaveCount(4)
  await expect(slider(page)).toHaveAttribute('aria-valuenow', '96.0')
  await expect(fight(page, '.pin-spacer')).toHaveCount(0)

  for (const n of [1, 2, 3, 4]) await expect(fight(page, `[data-step="${n}"] .title-line`)).toBeVisible()
  expect(await fight(page, '.chyron li').evaluateAll((els) => new Set(els.map((el) => `${Math.round(el.getBoundingClientRect().left)},${Math.round(el.getBoundingClientRect().top)}`)).size)).toBe(4)
  expect(errors).toEqual([])
})

test('without WebGL the fight still steps over its poster', async ({ page, errors }) => {
  await page.addInitScript({ content: NO_WEBGL })
  await loaded(page)
  await seekKeys(page, 'End')

  await expect(fight(page, '.poster')).toBeVisible()
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /step 4 of 4/)
  expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([])
})

test('the term popovers stay on screen at laptop widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')

  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 800 })
    await loaded(page)

    for (const term of await chapter(page, '.term').all()) {
      await term.locator('button').evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(1000)
      await term.locator('button').hover()

      const box = await term.locator('.def').boundingBox()

      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0)
      expect((box?.x ?? 0) + (box?.width ?? Infinity)).toBeLessThanOrEqual(width)
      await page.mouse.move(2, 2)
    }
  }
})

test('reduced motion never lays the step cards over the headline', async ({ page }, testInfo) => {
  for (const [width, height] of testInfo.project.name === 'phone' ? ([[390, 844]] as const) : ([[1024, 768], [1280, 620], [1470, 830]] as const)) {
    await page.setViewportSize({ width, height })
    await loaded(page, `${PATH}?reduced`)

    const pin = await fight(page, '.pin').boundingBox()
    const title = await fight(page, '.title').boundingBox()
    const panel = await fight(page, '.panel').boundingBox()
    const led = await fight(page, '.led').boundingBox()

    if (!pin || !title || !panel || !led) throw new Error('the fight has no boxes')

    expect(panel.y >= title.y + title.height || panel.x >= title.x + title.width).toBe(true)
    expect(panel.y).toBeGreaterThanOrEqual(pin.y)
    expect(panel.y + panel.height).toBeLessThanOrEqual(led.y + 0.5)
    expect(led.y + led.height).toBeLessThanOrEqual(pin.y + pin.height)
  }
})

test('the price names where the twelve-point ban comes from', async ({ page }) => {
  await loaded(page)

  await expect(chapter(page, '.price .credit')).toContainText(/12-point ban/i)
})
