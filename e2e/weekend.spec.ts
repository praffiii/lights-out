import { readFileSync } from 'node:fs'

import type { Page } from '@playwright/test'

import { crowdedChips, expect, hiddenText, LOADER_MS, scrollToEnd, stubPole, stubSeason, test, visibleBars } from './fixtures.ts'

const WAITING = 'The weekend data is on its way. Try again in a minute.'

const loaded = async (page: Page, path = '/weekend') => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const stage = (page: Page) => page.locator('.weekend-page .stage')

const pin = (page: Page) => page.locator('.weekend-page [data-pin="turn-1"]')

const withGl = async (page: Page, path = '/weekend') => {
  await loaded(page, path)
  await stage(page).scrollIntoViewIfNeeded()
  await expect(stage(page)).toHaveAttribute('data-gl', '', { timeout: 20_000 })
}

const centre = async (page: Page) => {
  const box = await stage(page).boundingBox()

  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 }
}

const POLE = JSON.parse(readFileSync('test/fixtures/pole/interlagos.json', 'utf8'))

const lapClock = (page: Page) => page.locator('.weekend-page .replay .lapclock')

const car = (page: Page) => page.locator('.weekend-page .band .car')

const seconds = (text: string | null) => {
  const [m, s] = (text ?? '').split(':')

  return Number(m) * 60 + Number(s)
}

const ring = async (page: Page, turn: number) => {
  const box = await page.locator(`.weekend-page [data-pin="turn-${turn}"]`).boundingBox()

  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) }
}

const centreOf = async (page: Page, selector: string) => {
  const box = await page.locator(selector).boundingBox()

  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 }
}

const withPole = async (page: Page, path = '/weekend') => {
  await stubPole(page, 'interlagos')
  await withGl(page, path)
}

const snapsTo = async (page: Page, turn: number) => {
  const { x, y } = await ring(page, turn)

  await page.mouse.move(x, y)
  await expect(stage(page)).toHaveAttribute('data-scrub', '')
  await expect.poll(async () => {
    const head = await centreOf(page, '.weekend-page .band .car .head')

    return Math.hypot(head.x - x, head.y - y)
  }).toBeLessThan(56)

  return { x, y }
}

const overlaps = (page: Page, a: string, b: string) =>
  page.evaluate(
    ([x, y]) => {
      const p = document.querySelector(x)?.getBoundingClientRect()
      const q = document.querySelector(y)?.getBoundingClientRect()

      return p !== undefined && q !== undefined && p.left < q.right - 1 && q.left < p.right - 1 && p.top < q.bottom - 1 && q.top < p.bottom - 1
    },
    [a, b],
  )

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(page.locator('.weekend-page h1')).toHaveText('São Paulo Grand Prix.')
    await expect(page.locator('.weekend-page .schedule li')).toHaveCount(5)
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

  await expect(page.locator('.weekend-page .teaser')).toBeAttached()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  expect(errors).toEqual([])
})

for (const width of [800, 1024, 1280]) {
  test(`fits at ${width} px with nothing on top of anything`, async ({ page, errors }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop')
    await page.setViewportSize({ width, height: 800 })
    await loaded(page, '/weekend?reduced')

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    expect(await overlaps(page, '.weekend-page .digits', '.weekend-page .note')).toBe(false)
    expect(await overlaps(page, '.weekend-page .band .figures', '.weekend-page .band .schedule')).toBe(false)
    expect(errors).toEqual([])
  })
}

test('the circuit stage runs the full width of the window with no frame', async ({ page, errors }) => {
  await loaded(page, '/weekend?reduced')

  const width = await page.evaluate(() => document.documentElement.clientWidth)
  const box = await stage(page).boundingBox()

  expect(box?.x).toBe(0)
  expect(box?.width).toBe(width)
  await expect(page.locator('.weekend-page .band .card')).toHaveCSS('border-top-width', '0px')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  expect(errors).toEqual([])
})

test('?reduced shows everything with no bars', async ({ page, errors }) => {
  await loaded(page, '/weekend?reduced')
  await page.waitForLoadState('networkidle')

  await expect(page.locator('.weekend-page .latest')).toBeVisible()
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

test('the countdown ticks', async ({ page, errors }) => {
  await loaded(page)

  const digits = page.locator('.weekend-page .digits')
  const before = await digits.textContent()

  await page.clock.fastForward(60_000)
  await expect(digits).not.toHaveText(before ?? '')
  expect(errors).toEqual([])
})

test('the calendar button downloads the weekend as five events', async ({ page, errors }) => {
  await loaded(page)

  const download = page.waitForEvent('download')

  await page.getByRole('button', { name: 'Add the weekend to your calendar' }).click()

  const file = await download

  expect(file.suggestedFilename()).toBe('interlagos-2026.ics')
  expect(readFileSync(await file.path(), 'utf8').match(/BEGIN:VEVENT/g)).toHaveLength(5)
  expect(errors).toEqual([])
})

test('a vertical swipe on the stage scrolls the page', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await withGl(page)

  const { x, y } = await centre(page)
  const before = await page.evaluate(() => scrollY)
  const cdp = await page.context().newCDPSession(page)

  await cdp.send('Input.synthesizeScrollGesture', { x, y, yDistance: -300, gestureSourceType: 'touch', speed: 800 })

  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(before + 100)
  expect(errors).toEqual([])
})

test('the Turns toggle hides the pins and the Sectors toggle turns the sectors off', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await withGl(page)

  await page.getByRole('button', { name: 'Turns' }).click()
  await expect(pin(page)).toHaveCSS('opacity', '0')

  await page.getByRole('button', { name: 'Sectors' }).click()
  await expect(stage(page)).toHaveAttribute('data-sectors', 'off')
  expect(errors).toEqual([])
})

test('a turn reads 01 on a chip above a ring', async ({ page, errors }) => {
  await loaded(page)
  await stage(page).scrollIntoViewIfNeeded()

  await expect(pin(page).locator('b')).toHaveText('01')
  expect(await pin(page).evaluate((el) => getComputedStyle(el, '::after').borderRadius)).toBe('50%')
  expect(errors).toEqual([])
})

for (const id of ['interlagos', 'vegas']) {
  test(`no two ${id} turn chips overlap on a phone`, async ({ page, errors }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone')
    await page.route('**/api/season', async (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: readFileSync('test/fixtures/season-snapshot.json', 'utf8').replace('"circuitId": "interlagos"', `"circuitId": "${id}"`) }),
    )
    await withGl(page)

    expect(await crowdedChips(page, '.weekend-page .band [data-pin]')).toEqual([])
    await expect(pin(page)).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('the sector names live on the map, not as pins, and the map is credited', async ({ page, errors }) => {
  await withGl(page)

  await expect(page.locator('.weekend-page .band .sector')).toHaveCount(0)
  await expect(page.locator('.weekend-page .band .credit')).toContainText('Map © OpenStreetMap contributors (ODbL)')
  expect(errors).toEqual([])
})

test('the band keeps its poster when the map never loads', async ({ page, errors }) => {
  await page.route('**/circuits/*-map*.webp', () => new Promise(() => {}))
  await loaded(page)
  await stage(page).scrollIntoViewIfNeeded()

  await expect(page.locator('.weekend-page .band .poster')).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(page.locator('.weekend-page .band .poster')).toBeVisible()
  expect(errors).toEqual([])
})

test('the weekend box opens the Race weekend page', async ({ page, errors }) => {
  await loaded(page, '/')
  await page.locator('.weekend-box button.weekend').click()
  await page.getByRole('link', { name: /Race weekend page/ }).click()

  await page.waitForURL('**/weekend')
  await expect(page.locator('.weekend-page h1')).toBeVisible()
  expect(errors).toEqual([])
})

test('This season links to the Race weekend page', async ({ page, errors }) => {
  await loaded(page, '/season')
  await page.locator('.this-weekend').getByRole('link', { name: /Race weekend/ }).click()

  await page.waitForURL('**/weekend')
  expect(errors).toEqual([])
})

test('clicking the now tile opens the Race weekend page', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page, '/season')
  await page.locator('.tiles .tile.is-now button').click()

  await page.waitForURL('**/weekend')
  expect(errors).toEqual([])
})

test('the link in the now card opens the Race weekend page', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await loaded(page, '/season')
  await page.locator('.tiles .tile.is-now button').tap()
  await page.locator('.calendar .card').getByRole('link', { name: /Race weekend/ }).tap()

  await page.waitForURL('**/weekend')
  expect(errors).toEqual([])
})

test('a hovered tile card shows no link the pointer cannot reach, and keyboard focus shows it', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page, '/season')

  const tile = page.locator('.tiles .tile.is-now')

  await tile.locator('button').hover()
  await expect(tile.locator('.card')).toBeVisible()
  await expect(tile.locator('.card a')).toBeHidden()

  await page.mouse.move(0, 0)
  await tile.locator('button').focus()
  await page.keyboard.press('Tab')
  await expect(tile.locator('.card a')).toBeFocused()
  expect(errors).toEqual([])
})

test('a done tile goes nowhere', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page, '/season')
  await page.locator('.tiles .tile:nth-child(13) button').click()
  await page.waitForTimeout(800)

  expect(new URL(page.url()).pathname).toMatch(/^\/season\/?$/)
  expect(errors).toEqual([])
})

test('the menu opens the Race weekend page', async ({ page, errors }) => {
  await loaded(page, '/')
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.locator('.menu .subs').getByRole('link', { name: 'Race weekend' }).click()

  await page.waitForURL('**/weekend')
  expect(errors).toEqual([])
})

test('Home to Weekend to Home keeps each page styled and the lap running', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page, '/')
  await page.locator('.weekend-box button.weekend').click()
  await page.getByRole('link', { name: /Race weekend page/ }).click()
  await page.waitForURL('**/weekend')

  await expect(page.locator('.weekend-page .top')).toHaveCSS('position', 'relative')
  await expect(page.locator('.weekend-page .digits')).toHaveCSS('display', 'flex')
  await expect(page.locator('.weekend-page .band dl')).toHaveCSS('padding-top', '0px')
  await expect(page.locator('.weekend-page .latest ol')).toHaveCSS('border-top-width', '0px')

  await expect(async () => {
    await page.getByRole('link', { name: 'Lights Out, home' }).click()
    await page.waitForURL((url) => url.pathname === '/', { timeout: 2_000 })
  }).toPass()
  await expect(page.locator('.hero .stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })

  const tag = page.locator('.hero .tag')
  const first = await tag.evaluate((el) => el.style.transform)

  await expect.poll(() => tag.evaluate((el) => el.style.transform)).not.toBe(first)
  expect(errors).toEqual([])
})

test('the P1 row fills with a bar as wide as the row', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)
  await page.locator('.weekend-page .latest ol li').first().scrollIntoViewIfNeeded()

  const sizes = await page.locator('.weekend-page .latest ol li').first().evaluate((li) => {
    const bar = li.querySelector(':scope > .bar')

    return bar ? [getComputedStyle(bar).width, getComputedStyle(li).width] : []
  })

  expect(sizes[0]).toBe(sizes[1])
  expect(errors).toEqual([])
})

test('the pole lap runs: the clock moves and S1 fills with its real split', async ({ page, errors }) => {
  await withPole(page)

  const first = page.locator('.weekend-page .replay .splits li').first()

  await page.clock.runFor(25_000)
  await expect(first).toHaveAttribute('data-state', 'done')
  await expect(first.locator('b')).toHaveText(POLE.sectors[0].toFixed(3))
  expect(seconds(await lapClock(page).textContent())).toBeGreaterThan(POLE.sectors[0])
  expect(errors).toEqual([])
})

test('the car first appears on the line with the lap clock at zero', async ({ page, errors }) => {
  await page.addInitScript(() => {
    new MutationObserver(() => {
      const root = document.documentElement

      if (root.dataset.firstClock !== undefined || !document.querySelector('.weekend-page .band .car[data-on]')) return

      root.dataset.firstClock = document.querySelector('.weekend-page .replay .lapclock')?.textContent ?? ''
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-on'] })
  })
  await withPole(page)
  await expect(page.locator('html')).toHaveAttribute('data-first-clock', /\d/)
  expect(seconds(await page.locator('html').getAttribute('data-first-clock'))).toBeLessThan(0.1)
  expect(errors).toEqual([])
})

test('the car and its readout fade in instead of popping in', async ({ page, errors }) => {
  await page.addInitScript(() => {
    const seen = new Set<Element>()

    new MutationObserver(() => {
      for (const el of document.querySelectorAll('.weekend-page .band .car, .weekend-page .band .readout')) {
        const style = getComputedStyle(el)

        if (seen.has(el) || style.visibility !== 'visible') continue

        seen.add(el)
        document.documentElement.dataset.firstOpacity = `${document.documentElement.dataset.firstOpacity ?? ''}${style.opacity};`
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style', 'data-on'] })
  })
  await withPole(page)
  await expect(page.locator('html')).toHaveAttribute('data-first-opacity', /^[\d.]+;[\d.]+;$/)

  const first = (await page.locator('html').getAttribute('data-first-opacity')) ?? ''

  expect(first.split(';').filter(Boolean).map(Number)).toEqual([0, 0])
  await expect(car(page)).toHaveCSS('opacity', '1')
  await expect(page.locator('.weekend-page .band .readout')).toHaveCSS('opacity', '1')
  expect(errors).toEqual([])
})

test('hovering the track snaps the car and the clock jumps', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await withPole(page)
  await expect(car(page)).toBeVisible()

  const before = await lapClock(page).textContent()

  await snapsTo(page, 14)
  await expect(lapClock(page)).not.toHaveText(before ?? '')

  const head = await centreOf(page, '.weekend-page .band .car .head')
  const tail = await centreOf(page, '.weekend-page .band .car i:last-child')

  expect(Math.hypot(tail.x - head.x, tail.y - head.y)).toBeLessThan(80)
  await expect(stage(page)).toHaveCSS('cursor', 'pointer')
  expect(errors).toEqual([])
})

test('hover still snaps after the window is resized', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await withPole(page)
  await snapsTo(page, 14)

  await page.setViewportSize({ width: 1100, height: 760 })
  await stage(page).scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  await snapsTo(page, 6)
  expect(errors).toEqual([])
})

test('reduced motion shows the finished lap as a still', async ({ page, errors }) => {
  await withPole(page, '/weekend?reduced')

  await expect(lapClock(page)).toHaveText('1:27.470')
  await expect(page.locator('.weekend-page .replay .splits li[data-state="done"]')).toHaveCount(3)
  await expect(car(page)).toHaveCount(0)
  await expect(page.locator('.weekend-page .band .readout')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('tapping a turn on a phone jumps the replay to it', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await withPole(page)

  const turn = page.locator('.weekend-page [data-pin="turn-8"]')
  const { x, y } = await ring(page, 8)

  await page.touchscreen.tap(x, y)
  await expect(turn).toHaveAttribute('data-hit', '')
  await expect(turn.locator('[data-apex]')).toContainText('km/h')

  const inside = await stage(page).evaluate((el) => {
    const box = el.getBoundingClientRect()
    const card = el.querySelector('.readout')?.getBoundingClientRect()

    return card !== undefined && card.left >= box.left - 1 && card.right <= box.right + 1 && card.top >= box.top - 1 && card.bottom <= box.bottom + 1
  })

  expect(inside).toBe(true)
  expect(errors).toEqual([])
})

test("no stored lap keeps today's band", async ({ page, errors }) => {
  await withGl(page)

  await expect(page.locator('.weekend-page .replay')).toHaveCount(0)
  await expect(page.locator('.weekend-page .band .credit')).not.toContainText('OpenF1')
  expect(errors).toEqual([])
})

test('the replay pauses off screen', async ({ page, errors }) => {
  await withPole(page)
  await expect(car(page)).toBeVisible()
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000)

  const before = seconds(await lapClock(page).textContent())

  await page.evaluate(() => scrollTo(0, 0))
  await expect(stage(page)).not.toBeInViewport()
  await page.waitForTimeout(300)
  await page.clock.runFor(2000)
  await stage(page).scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)

  expect(Math.abs(seconds(await lapClock(page).textContent()) - before)).toBeLessThan(0.1)
  expect(errors).toEqual([])
})

test('clicking the track opens the explorer there', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await withPole(page)

  const { x, y } = await snapsTo(page, 14)

  await page.mouse.click(x, y)
  await expect(page).toHaveURL(/\/lap\/interlagos\?at=0\.\d{4}$/)
  await expect(page.locator('.lap')).toHaveAttribute('data-ready', '', { timeout: 20_000 })

  const at = Number(new URL(page.url()).searchParams.get('at'))

  await expect.poll(async () => Math.abs(Number(await page.locator('[data-km]').textContent()) - at * 4.309)).toBeLessThan(0.2)
  expect(errors).toEqual([])
})
