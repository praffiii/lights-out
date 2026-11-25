import { readFileSync } from 'node:fs'

import type { Page } from '@playwright/test'

import { CALENDAR } from '../src/circuits/calendar.ts'
import { expect, hiddenText, LOADER_MS, NO_WEBGL, scrollToEnd, stubLatest, test } from './fixtures.ts'

const turnsOf = (tile: string) => Object.keys(JSON.parse(readFileSync(`src/circuits/pins/${tile}.json`, 'utf8')).laps).length

const PATH = '/chapters/power-unit'

const loaded = async (page: Page, latest: string | null = 'monza') => {
  await stubLatest(page, latest)
  await page.goto(PATH)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.chapter-page ${selector}`)

const band = (page: Page, selector = '') => page.locator(`.chapter-page .lap-band ${selector}`.trim())

const JOBS = [
  '1.6 litres, six cylinders. Burns fuel for about half the power.',
  'Exhaust gas spins it, and it packs more air into the engine.',
  'An electric motor geared to the crank. Pushes, or brakes and charges.',
  'The battery. It holds what the MGU-K harvests.',
  'Sends the power between battery and motor.',
]

const CHIPS = ['Power unit', 'MGU-K', 'MGU-H · until 2025', 'Energy store', 'Turbocharger', 'Harvesting', 'Deployment', 'Overtake Mode', 'Sustainable fuel']

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText('Half fuel.Half battery.')
    await expect(page).toHaveTitle('The power unit · Lights Out')
    expect(errors).toEqual([])
  })

  test(`the pole-lap band sits in the opposite theme, ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(band(page)).toHaveAttribute('data-theme', colorScheme === 'light' ? 'dark' : 'light')

    const [bg, body] = await page.evaluate(() => [
      getComputedStyle(document.querySelector('.lap-band') ?? document.body).backgroundColor,
      getComputedStyle(document.body).backgroundColor,
    ])

    expect(bg).toBe(colorScheme === 'light' ? 'rgb(14, 15, 17)' : 'rgb(244, 243, 239)')
    expect(bg).not.toBe(body)
  })
}

test('no horizontal overflow and every photo is credited', async ({ page, errors }) => {
  await loaded(page)
  await scrollToEnd(page)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  expect(overflow).toBeLessThanOrEqual(0)
  expect(await hiddenText(page)).toEqual([])

  for (const selector of [
    '.photo-band .credit',
    '.mguh .credit',
    '.history figure:nth-child(1) .credit',
    '.history figure:nth-child(2) .credit',
    '.history figure:nth-child(3) .credit',
    '.history figure:nth-child(4) .credit',
    '.next .credit',
  ])
    await expect(chapter(page, selector)).toContainText(/CC|Public domain/)

  expect(errors).toEqual([])
})

test('Five parts shows five pins on desktop or five tags and rows on a phone', async ({ page, errors }, testInfo) => {
  await loaded(page)

  if (testInfo.project.name === 'desktop') {
    await expect(chapter(page, '.five-parts .pin')).toHaveCount(5)
    await expect(chapter(page, '.five-parts .pin .job')).toHaveText(JOBS, { useInnerText: true })
  } else {
    await expect(chapter(page, '.five-parts .tag')).toHaveCount(5)
    await expect(chapter(page, '.five-parts .part-rows li')).toHaveCount(5)
    await expect(chapter(page, '.five-parts .part-rows .job')).toHaveText(JOBS, { useInnerText: true })
  }

  expect(errors).toEqual([])
})

test('shows the 2026 numbers, payoff, plus row and glossary chips in order', async ({ page, errors }) => {
  await loaded(page)

  expect(await chapter(page, '.figures-grid .val').allTextContents()).toEqual(['400', '350', '1.6', '0'])
  await expect(chapter(page, '.numbers-band .payoff')).toContainText('Together, about 750 kW. More than 1,000 hp.')
  await expect(chapter(page, '.numbers-band .plus')).toContainText('+0.5 MJ')
  await expect(chapter(page, '.numbers-band .plus a')).toHaveAttribute('href', '/chapters/overtaking')
  expect(await chapter(page, '.words .chips button').allTextContents()).toEqual(CHIPS)
  expect(errors).toEqual([])
})

test('the hero and the Next card lead on to chapter 07', async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.next .caption > p')).toHaveText('Next · Chapter 07 · 6 min')
  await expect(chapter(page, '.next h2')).toHaveText('Defending.')
  await expect(chapter(page, '.next .read')).toHaveAttribute('href', '/chapters/defending')
  await expect(chapter(page, '.opening nav').getByRole('link', { name: /07 Defending/ })).toHaveAttribute('href', '/chapters/defending')
  expect(errors).toEqual([])
})

test('menu, Home and Chapter 05 lead here and Home reads eight chapters', async ({ page, errors }) => {
  await page.goto('/')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

  await expect(page.locator('.chapters .head')).toContainText('Eight chapters · 47 min')
  await expect(page.locator('.rows li:nth-child(6) a')).toHaveAttribute('href', PATH)
  await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.locator('.menu nav .line > a', { hasText: 'The engine' })).toHaveAttribute('href', PATH)

  await page.goto('/chapters/inside-the-car')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

  await expect(chapter(page, '.opening').getByRole('link', { name: /06 The power unit/ })).toHaveAttribute('href', PATH)
  await expect(chapter(page, '.next .read')).toHaveAttribute('href', PATH)
  expect(errors).toEqual([])
})

test('/api/pole/latest wins over /api/pole/$circuit', async ({ page }) => {
  const response = await page.request.get('/api/pole/latest')

  expect([200, 204]).toContain(response.status())
  expect(await response.text()).not.toBe('{"status":"none"}')
})

test('first frame shows the Monza fade before T1 with row 01 open', async ({ page, errors }) => {
  await loaded(page, 'monza')
  await band(page).evaluate((el) => window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + scrollY - 80)))

  await expect(band(page, '.headline')).toHaveText('Flat out,and slowing.')
  await expect(band(page, '[data-speed]')).toHaveText('338 km/h')
  await expect(band(page, '[data-rpm]')).toHaveText('11,595 rpm')
  await expect(band(page, '[data-gear]')).toContainText('Gear 8')
  await expect(band(page, '[data-mguk]')).toHaveText('↓ Fading')
  await expect(band(page, '[data-battery]')).toHaveText('Low')
  await expect(band(page, '[data-part="v6"]')).toHaveAttribute('data-active', '')
  await expect(band(page, '[data-inset-label]')).toHaveText('Monza · T1 ahead')

  await expect(band(page, '[data-tick]')).toHaveCount(turnsOf(CALENDAR.monza.tile))
  expect(errors).toEqual([])
})

test('arrow right on the strip reaches braking and opens row 03 MGU-K', async ({ page, errors }) => {
  await loaded(page, 'monza')
  await band(page).scrollIntoViewIfNeeded()

  const slider = band(page, '[role="slider"]')

  await expect(slider).toBeVisible()
  await slider.focus()

  for (let i = 0; i < 6; i++) {
    if ((await band(page, '[data-mguk]').textContent())?.includes('Harvesting')) break

    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(250)
  }

  await expect(band(page, '[data-mguk]')).toContainText('Harvesting')
  await expect(band(page, '[data-part="mguK"]')).toHaveAttribute('data-active', '')
  await expect(band(page, '[data-part="energyStore"] [data-state]')).toHaveText('Charging · est.')
  expect(errors).toEqual([])
})

test('scrolling down then back up to the same position shows the same readouts', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page, 'monza')
  await band(page).evaluate((el) => window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + scrollY - 80)))
  await expect(band(page, '[data-speed]')).toHaveText('338 km/h')

  const box = await band(page).evaluate((el) => ({ top: el.getBoundingClientRect().top + scrollY, vh: window.innerHeight }))
  const mid = Math.round(box.top + box.vh * 1.5)
  const low = Math.round(box.top + box.vh * 3.5)

  const settled = async () => {
    let prev = ''

    await expect
      .poll(
        async () => {
          const now = (await band(page, '[role="slider"]').getAttribute('aria-valuenow')) ?? ''
          const same = now !== '' && now === prev

          prev = now

          return same
        },
        { intervals: [200], timeout: 5000 },
      )
      .toBe(true)
  }

  await page.evaluate((y) => window.scrollTo(0, y), mid)
  await settled()

  const down = {
    speed: await band(page, '[data-speed]').textContent(),
    rpm: await band(page, '[data-rpm]').textContent(),
    mguk: await band(page, '[data-mguk]').textContent(),
  }

  await page.evaluate((y) => window.scrollTo(0, y), low)
  await settled()
  await page.evaluate((y) => window.scrollTo(0, y), mid)
  await settled()

  const up = {
    speed: await band(page, '[data-speed]').textContent(),
    rpm: await band(page, '[data-rpm]').textContent(),
    mguk: await band(page, '[data-mguk]').textContent(),
  }

  expect(up).toEqual(down)
  expect(errors).toEqual([])
})

test('uses circuit metadata dynamically when latest is Las Vegas', async ({ page, errors }) => {
  await loaded(page, 'vegas')
  await band(page).scrollIntoViewIfNeeded()

  const vegas = CALENDAR.vegas

  await expect(band(page, '.head .label')).toContainText(vegas.name)
  await expect(band(page, '.explore')).toHaveAttribute('href', '/lap/vegas')
  await expect(band(page, '.inset img')).toHaveAttribute('src', `/circuits/${vegas.tile}-inset.webp`)
  await expect(band(page, '[data-tick]')).toHaveCount(turnsOf(vegas.tile))
  expect(errors).toEqual([])
})

test('when /api/pole/latest returns 204, shows the empty message and invents no numbers', async ({ page, errors }) => {
  await loaded(page, null)
  await band(page).scrollIntoViewIfNeeded()

  await expect(band(page)).toContainText('No pole lap to ride yet.')
  await expect(band(page)).not.toContainText('km/h')
  await expect(band(page)).not.toContainText('rpm')
  expect(errors).toEqual([])
})

test('reduced motion skips pinning and shows the first frame', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page, 'monza')

  await expect(page.locator('.pin-spacer')).toHaveCount(0)
  await expect(band(page, 'canvas')).toHaveCount(0)
  await expect(band(page, '[data-speed]')).toHaveText('338 km/h')
  await expect(band(page, '[data-rpm]')).toHaveText('11,595 rpm')
  await expect(band(page, '[data-mguk]')).toHaveText('↓ Fading')
  expect(errors).toEqual([])
})

test('at 360 px wide no element overflows the lap band', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone')
  await page.setViewportSize({ width: 360, height: 800 })
  await loaded(page, 'monza')
  await band(page).scrollIntoViewIfNeeded()
  await expect(band(page, '[data-speed]')).toHaveText('338 km/h')

  const leaked = await band(page).evaluate((el) => {
    const box = el.getBoundingClientRect()

    return [...el.querySelectorAll('*')].flatMap((child) => {
      const r = child.getBoundingClientRect()

      if (r.width === 0 || r.height === 0) return []

      return r.left < box.left - 1 || r.right > box.right + 1 ? [`${child.tagName}.${child.className}: ${r.left.toFixed(1)}..${r.right.toFixed(1)} vs ${box.left.toFixed(1)}..${box.right.toFixed(1)}`] : []
    })
  })

  expect(leaked).toEqual([])
  expect(errors).toEqual([])
})

const hasPixels = async (page: Page) => {
  const box = await band(page, '.stage canvas').boundingBox()

  if (!box || box.width < 10 || box.height < 10) return false

  const shot = await page.screenshot({ clip: box })

  return page.evaluate(async (png) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob())
    const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d')

    if (!ctx) return false

    ctx.drawImage(bitmap, 0, 0)

    const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    const r0 = data[0] ?? 0
    const g0 = data[1] ?? 0
    const b0 = data[2] ?? 0
    let diff = 0

    for (let i = 0; i < data.length; i += 16) {
      if (Math.abs((data[i] ?? 0) - r0) + Math.abs((data[i + 1] ?? 0) - g0) + Math.abs((data[i + 2] ?? 0) - b0) > 24) diff++
    }

    return diff > 100
  }, shot.toString('base64'))
}

test('the live engine draws non-blank pixels once the band is near', async ({ page, errors }) => {
  await loaded(page, 'monza')
  await band(page).evaluate((el) => window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + scrollY - 80)))

  await expect(band(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })
  await expect(band(page, '.stage canvas')).toBeVisible()
  expect(await hasPixels(page)).toBe(true)
  expect(errors).toEqual([])
})

test('without WebGL the still shows and the strip still moves the readouts', async ({ page, errors }) => {
  await page.addInitScript({ content: NO_WEBGL })
  await loaded(page, 'monza')
  await band(page).evaluate((el) => window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + scrollY - 80)))

  await expect(band(page, '.stage img')).toBeVisible()
  await expect(band(page, '.stage')).not.toHaveAttribute('data-gl', '')
  await expect(band(page, '[data-speed]')).toHaveText('338 km/h')

  const slider = band(page, '[role="slider"]')

  await slider.focus()

  for (let i = 0; i < 6; i++) {
    if ((await band(page, '[data-mguk]').textContent())?.includes('Harvesting')) break

    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(250)
  }

  await expect(band(page, '[data-mguk]')).toContainText('Harvesting')
  expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([])
})

test('toggling the theme with the band on screen flips the band and keeps drawing', async ({ page, errors }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await loaded(page, 'monza')
  await band(page).evaluate((el) => window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + scrollY - 80)))
  await expect(band(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })

  const before = await band(page).evaluate((el) => getComputedStyle(el).backgroundColor)

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => band(page).evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before)
  await expect(band(page, '.stage')).toHaveAttribute('data-gl', '', { timeout: 20_000 })
  expect(await hasPixels(page)).toBe(true)
  expect(errors).toEqual([])
})
