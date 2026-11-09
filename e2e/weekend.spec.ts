import { readFileSync } from 'node:fs'

import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, scrollToEnd, stubSeason, test, visibleBars } from './fixtures.ts'

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

const drag = async (page: Page, dx: number) => {
  const { x, y } = await centre(page)

  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y, { steps: 12 })
  await page.mouse.up()
}

const at = async (page: Page) => {
  const box = await pin(page).boundingBox()

  return { x: box?.x ?? 0, y: box?.y ?? 0 }
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

test('dragging the stage moves turn 1, and Reset brings it back', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await withGl(page)

  const home = await at(page)

  await drag(page, 200)
  await expect.poll(async () => Math.abs((await at(page)).x - home.x) + Math.abs((await at(page)).y - home.y)).toBeGreaterThan(20)

  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(stage(page)).toHaveAttribute('data-yaw', '0')
  await expect.poll(async () => Math.max(Math.abs((await at(page)).x - home.x), Math.abs((await at(page)).y - home.y))).toBeLessThanOrEqual(2)
  expect(errors).toEqual([])
})

test('the spin stops at 45 degrees with every pin inside the stage', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await withGl(page, '/weekend?reduced')
  await drag(page, 600)

  await expect(stage(page)).toHaveAttribute('data-yaw', '45')

  const outside = await stage(page).evaluate((el) => {
    const box = el.getBoundingClientRect()

    return [...el.querySelectorAll<HTMLElement>('[data-pin]')].flatMap((p) => {
      const b = p.getBoundingClientRect()
      const shown = getComputedStyle(p).visibility !== 'hidden' && getComputedStyle(p).display !== 'none'
      const out = b.left < box.left - 1 || b.right > box.right + 1 || b.top < box.top - 1 || b.bottom > box.bottom + 1

      return shown && out ? [p.dataset.pin] : []
    })
  })

  expect(outside).toEqual([])
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
  await expect(stage(page)).toHaveAttribute('data-yaw', '0')
  expect(errors).toEqual([])
})

test('the Turns toggle hides the pins and the Sectors toggle hides the S labels', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await withGl(page)

  await page.getByRole('button', { name: 'Turns' }).click()
  await expect(pin(page)).toHaveCSS('opacity', '0')

  await page.getByRole('button', { name: 'Sectors' }).click()
  await expect(page.locator('.weekend-page [data-pin="S1"]')).toHaveCSS('opacity', '0')
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
