import type { Page } from '@playwright/test'

import { expect, hiddenText, LOADER_MS, scrollToEnd, stubSeason, test, visibleBars } from './fixtures.ts'

const whenLoaderLifts = async (page: Page) => {
  const reading = await page.waitForFunction(
    () => {
      if (document.querySelector('.loader p')?.textContent === 'Loading · 100%') sessionStorage.setItem('full', '1')

      if (document.querySelector('.loader')) return false

      const band = document.querySelector('.hero .stage')

      return { at: performance.now(), canvas: band?.querySelector('canvas') !== null && band !== null, poster: band?.querySelector<HTMLImageElement>('.poster')?.hidden === true, full: sessionStorage.getItem('full') === '1' }
    },
    null,
    { polling: 'raf', timeout: LOADER_MS },
  )

  const value = await reading.jsonValue()

  if (!value) throw new Error('the loader never lifted')

  return value
}

for (const [name, options] of [
  ['light', { colorScheme: 'light' }],
  ['dark', { colorScheme: 'dark' }],
  ['reduced motion', { reducedMotion: 'reduce' }],
] as const) {
  test(`loads with no page errors and no hydration warnings in ${name}`, async ({ page, errors }) => {
    await page.emulateMedia(options)
    await page.goto('/')
    await page.waitForTimeout(4000)

    expect(errors).toEqual([])
    await expect(page.locator('header.header')).toBeVisible()
    await expect(page.locator('footer')).toContainText('Lights Out is an unofficial fan project. Not affiliated with Formula 1, FOM or any team.')
  })
}

test('paints the saved theme before first paint', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark')
    document.addEventListener('DOMContentLoaded', () => {
      sessionStorage.setItem('themeAtDomReady', document.documentElement.dataset.theme ?? '')
    })
  })
  await page.goto('/')

  expect(await page.evaluate(() => sessionStorage.getItem('themeAtDomReady'))).toBe('dark')
})

test('opens the weekend panel and moves through its tabs from the keyboard', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const box = page.locator('button.weekend')

  await box.click()
  await expect(page.getByRole('tab', { name: 'Now' })).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('tab', { name: 'Now' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Next' })).toBeFocused()
  await expect(page.getByRole('tab', { name: 'Next' })).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('tab', { name: 'Now' })).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('tab', { name: 'Standings' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(page.locator('.weekend-panel')).toBeHidden()
  await expect(box).toBeFocused()
  await expect(box).toHaveAttribute('aria-expanded', 'false')
  expect(errors).toEqual([])
})

test('renders Home without the box or band when the season API is warming', async ({ page, errors }) => {
  await stubSeason(page, { status: 503, body: JSON.stringify({ status: 'warming' }) })
  await page.goto('/')

  const lifted = await whenLoaderLifts(page)

  expect(lifted.at).toBeLessThan(2600)
  await expect(page.locator('.weekend')).toHaveCount(0)
  await expect(page.locator('.hero .stage')).toHaveCount(0)

  await scrollToEnd(page)

  expect(await hiddenText(page)).toEqual([])
  expect(await visibleBars(page)).toBe(0)
  expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([])
})

test('shows the live circuit when the page appears', async ({ page, errors }) => {
  await page.goto('/')

  const lifted = await whenLoaderLifts(page)

  expect(lifted).toMatchObject({ canvas: true, poster: true })
  expect(errors).toEqual([])
})

test('holds the lights for a late circuit, then lifts on time with the poster greyed', async ({ page, errors }) => {
  let release = () => {}

  const held = new Promise<void>((resolve) => {
    release = resolve
  })

  await page.route('**/circuits/*.glb', async (route) => {
    await held
    await route.continue()
  })
  await page.goto('/')

  const lifted = await whenLoaderLifts(page)

  expect(lifted).toMatchObject({ full: false, poster: false })
  expect(lifted.at).toBeLessThan(2600)
  await expect(page.locator('.hero .stage')).toHaveAttribute('data-waiting', '')

  release()

  await expect(page.locator('.hero canvas')).toHaveCount(1)
  await expect(page.locator('.hero .poster')).toBeHidden()
  expect(errors).toEqual([])
})

for (const [name, breakIt] of [
  ['its model fails to load', (page: Page) => page.route('**/circuits/*.glb', (route) => route.abort())],
  [
    'WebGL is unavailable',
    (page: Page) =>
      page.addInitScript({
        content: `const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return String(type).startsWith('webgl') ? null : get.call(this, type, ...rest) }`,
      }),
  ],
] as const) {
  test(`keeps Home and the poster when the circuit breaks because ${name}`, async ({ page, errors }) => {
    await breakIt(page)
    await page.goto('/')

    const lifted = await whenLoaderLifts(page)

    expect(lifted.at).toBeLessThan(2600)
    await page.locator('.hero .stage').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    await expect(page.locator('.hero h1')).toBeAttached()
    await expect(page.locator('.hero .poster')).toBeVisible()
    await expect(page.locator('.hero .stage')).not.toHaveAttribute('data-waiting', '')
    await expect(page.locator('footer')).toContainText('Lights Out is an unofficial fan project.')
    expect(errors.filter((e) => e.startsWith('pageerror') && !e.includes('Could not load /circuits/'))).toEqual([])
  })
}

test('preloads only the hero photo, not the hidden menu photos', async ({ request }) => {
  const html = await (await request.get('/')).text()

  expect([...html.matchAll(/<link rel="preload" as="image" href="([^"]+)"/g)].map((m) => m[1])).toEqual(['/img/cars/pia.webp'])
})

test('keeps animated text readable by screen readers', async ({ page, errors }) => {
  await page.goto('/')
  await whenLoaderLifts(page)

  const tree = await page.locator('body').ariaSnapshot()

  for (const text of ['Lights Out is an unofficial fan project. Not affiliated with Formula 1, FOM or any team.', '4.309 km', '305.879 km', 'Five chapters · 30 min'])
    expect(tree).toContain(text)

  expect(errors).toEqual([])
})

test('the footer lights come on one by one, then go out together', async ({ page, errors }) => {
  await page.goto('/')
  await page.waitForSelector('.loader', { state: 'detached', timeout: LOADER_MS })
  await page.locator('.next-race').waitFor()
  await page.locator('.next-race .lights').evaluate((row) => {
    const lights = [...row.children]
    const log: string[] = []

    new MutationObserver((records) => {
      for (const r of records) if (r.target instanceof Element) log.push(`${r.oldValue === 'on' ? 'off' : 'on'}${lights.indexOf(r.target)}`)
      row.setAttribute('data-log', log.join(' '))
    }).observe(row, { subtree: true, attributeFilter: ['class'], attributeOldValue: true })
  })
  await page.locator('.next-race').scrollIntoViewIfNeeded()
  await expect(page.locator('.next-race .lights')).toHaveAttribute('data-log', 'on0 on1 on2 on3 on4 off0 off1 off2 off3 off4', { timeout: 10_000 })
  await expect(page.locator('.next-race .lights i.on')).toHaveCount(0)
  await expect(page.locator('.next-race .count b')).toHaveCount(4)
  await expect(page.locator('.next-race .count b').first()).toHaveText('02')
  expect(errors).toEqual([])
})

test('keeps the footer lights off under reduced motion', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('.next-race').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)

  await expect(page.locator('.next-race .lights i')).toHaveCount(5)
  await expect(page.locator('.next-race .lights i.on')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('keeps the close button on screen while the menu is open, even if the page scrolls down', async ({ page, errors }) => {
  await page.goto('/')
  await page.waitForSelector('.loader', { state: 'detached', timeout: LOADER_MS })
  await page.locator('.next-race').scrollIntoViewIfNeeded()
  await page.mouse.wheel(0, -300)
  await expect(page.locator('.header')).not.toHaveClass(/away/)
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.evaluate(() => {
    document.documentElement.classList.remove('lenis-stopped')
    scrollBy(0, 120)
  })
  await page.waitForTimeout(600)

  await expect(page.getByRole('button', { name: 'Close' })).toBeInViewport()
  expect(errors).toEqual([])
})

test('Start the guide opens chapter 01', async ({ page, errors }) => {
  await page.goto('/')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
  await page.getByRole('link', { name: /Start the guide/ }).click()

  await expect(page).toHaveURL(/\/chapters\/race-weekend$/)
  await expect(page.locator('.chapter-page h1')).toBeVisible()
  expect(errors).toEqual([])
})

test("Home's chapter 01 row leads to chapter 01", async ({ page, errors }) => {
  await page.goto('/')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

  await expect(page.locator('.rows li').first().getByRole('link')).toHaveAttribute('href', '/chapters/race-weekend')
  expect(errors).toEqual([])
})
