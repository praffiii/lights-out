import { readFileSync } from 'node:fs'

import type { Page } from '@playwright/test'
import { Schema } from 'effect'

import { expect, hiddenText, LOADER_MS, scrollToEnd, stubSeason, test, visibleBars } from './fixtures.ts'

const PATH = '/chapters'

const CHAPTERS = [
  '/chapters/race-weekend',
  '/chapters/overtaking',
  '/chapters/tyres-and-strategy',
  '/chapters/flags',
  '/chapters/inside-the-car',
  '/chapters/power-unit',
  '/chapters/defending',
  '/chapters/championships',
  '/chapters/drs',
]

const WIDTHS = [320, 390, 768, 1024, 1199, 1200, 1440, 1920]

const guide = (page: Page, selector: string) => page.locator(`.guide-page ${selector}`)

const loaded = async (page: Page) => {
  await stubSeason(page)
  await page.goto(PATH)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const hrefs = (page: Page, selector: string) => guide(page, selector).evaluateAll((els) => els.map((el) => el.getAttribute('href')))

for (const colorScheme of ['light', 'dark'] as const) {
  test(`opens with the figures and nine chapters in order, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await loaded(page)

    await expect(page).toHaveTitle('How F1 works · Lights Out')
    await expect(guide(page, '.opening .label')).toHaveText('How F1 works · 9 chapters')
    await expect(guide(page, 'h1')).toHaveText('Read thisbefore Sunday.')
    await expect(guide(page, '.figures dd')).toHaveText(['9', '52', '2026'])
    await expect(guide(page, '.figures p')).toHaveText('Nine short chapters, 52 minutes in all. Read them in order and the next Grand Prix makes sense from the first lap.')
    expect(await hrefs(page, '.list li > a')).toEqual(CHAPTERS)
    await expect(guide(page, '.list li:first-child')).toContainText('Start here')
    await expect(guide(page, '.list li:nth-child(6)')).toContainText('A V6 and an electric motor, close to 50:50.')
    await expect(guide(page, '.opening nav a')).toHaveAttribute('href', '/chapters/race-weekend')
    await expect(guide(page, '.next .read')).toHaveAttribute('href', '/chapters/race-weekend')
    expect(errors).toEqual([])
  })
}

test('fits every width', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await loaded(page)

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}`).toBeLessThanOrEqual(0)

    const out = await guide(page, 'h1, .list h2, .list p, .figures dd, .next h2').evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > innerWidth).map((el) => el.textContent))

    expect(out, `${width}`).toEqual([])
  }

  expect(errors).toEqual([])
})

test('reduced motion shows everything still', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)
  await scrollToEnd(page)

  expect(await hiddenText(page, '.term')).toEqual([])
  expect(await visibleBars(page)).toBe(0)
  expect(errors).toEqual([])
})

test('everything has arrived after a scroll to the end', async ({ page, errors }) => {
  await loaded(page)
  await scrollToEnd(page)

  expect(await hiddenText(page, '.term')).toEqual([])
  expect(errors).toEqual([])
})

test('a row shows its photo under the pointer and only there', async ({ page, errors }, testInfo) => {
  await loaded(page)

  const row = guide(page, '.list li:nth-child(4) a')

  await row.scrollIntoViewIfNeeded()

  if (testInfo.project.name === 'phone') {
    await row.dispatchEvent('pointerover', { pointerType: 'touch' })
    await expect(page.locator('.preview .card')).toBeHidden()
  } else {
    await row.hover()
    await expect(page.locator('.preview img[src="/img/ch04.jpg"]')).toBeVisible()
    await expect(row).toHaveCSS('color', 'rgb(244, 243, 239)')
    await guide(page, '.heads').hover()
    await expect(page.locator('.preview .card')).toHaveCSS('transform', 'matrix(0, 0, 0, 0, 0, 0)')
  }

  expect(errors).toEqual([])
})

test('the close keeps its caption on the photo and its credit clear', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)

  const box = async (selector: string) => {
    const b = await guide(page, selector).boundingBox()

    if (!b) throw new Error(`no ${selector}`)

    return b
  }

  const caption = await box('.next .caption')
  const credit = await box('.next .credit')
  const width = page.viewportSize()?.width ?? 0

  expect(caption.y + caption.height).toBeLessThanOrEqual(credit.y)
  expect(width - caption.x - caption.width).toBeGreaterThanOrEqual(caption.x)
  expect(errors).toEqual([])
})

const sizes = (page: Page) =>
  guide(page, 'h1, .figures, .list, .list li, .next, .next h2').evaluateAll((els) => els.map((el) => `${el.tagName} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)} ${getComputedStyle(el).fontSize}`))

test('looks the same from Home as on a direct visit', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)

  const direct = await sizes(page)

  await page.goto('/')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

  const home = await page.locator('.rows li').first().evaluate((el) => el.getBoundingClientRect().height)

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.locator('.menu nav .line > a', { hasText: 'How F1 works' }).click()
  await expect(guide(page, 'h1')).toBeVisible()
  expect(await sizes(page)).toEqual(direct)

  await page.goBack()
  await expect(page.locator('.rows li').first()).toBeVisible()
  expect(await page.locator('.rows li').first().evaluate((el) => el.getBoundingClientRect().height)).toBe(home)
  expect(errors).toEqual([])
})

test('a full load answers with the page itself', async ({ request }) => {
  const response = await request.get('/chapters/')

  expect(response.status()).toBe(200)
  expect(await response.text()).toContain('before Sunday.')
})

const ORDER = [1, 2, 7, 4, 3, 6, 5, 8]

const { laps } = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Struct({ laps: Schema.Number })))(readFileSync('src/guide/vegas.json', 'utf8'))

const LAPS = [0, 2, 12, 19, 19, 26, 39, 50]

const still = async (page: Page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)
}

test('eight moments lead to their chapters in race order', async ({ page, errors }) => {
  await still(page)

  expect(await hrefs(page, '.race li a')).toEqual(ORDER.map((n) => CHAPTERS[n - 1]))
  await expect(guide(page, '.race').getByRole('link', { name: 'Chapter 02, How overtaking works. Lap 2 · Lead change Russell passes Verstappen' })).toBeVisible()
  await expect(guide(page, '.race .top p').first()).toHaveText('Las Vegas · 21 November 2026')
  await expect(guide(page, '.race .drs a')).toHaveAttribute('href', '/chapters/drs')
  await expect(guide(page, '.race .tick')).toHaveCount(8)
  expect(errors).toEqual([])
})

test('the ruler is true to scale on a wide screen', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await still(page)

  const ruler = await guide(page, '.race .ruler').boundingBox()
  const ticks = await guide(page, '.race .tick').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x))

  for (const [i, lap] of LAPS.entries()) {
    const width = ruler?.width ?? 0
    const x = (ruler?.x ?? 0) + (lap / laps) * width - (lap === laps ? 2 : 0)

    expect(Math.abs((ticks[i] ?? 0) - x), `lap ${lap}`).toBeLessThanOrEqual(1)
  }

  expect(errors).toEqual([])
})

test('no moment covers another at any width', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await still(page)

  for (const width of [320, 390, 768, 1199, 1200, 1240, 1300, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })

    const bad = await guide(page, '.race li a').evaluateAll((els) => {
      const boxes = els.flatMap((el) =>
        [...el.querySelectorAll('.when, .num, .what')].map((part) => {
          const range = document.createRange()

          range.selectNodeContents(part)

          const a = range.getBoundingClientRect()

          return { el, n: part.textContent, l: a.left, r: a.right, t: a.top, b: a.bottom }
        }),
      )

      const hits = boxes.flatMap((a, i) => boxes.slice(i + 1).flatMap((b) => (a.el !== b.el && a.l < b.r + 16 && b.l < a.r + 16 && a.t < b.b && b.t < a.b ? [`${a.n}/${b.n}`] : [])))

      return [...hits, ...boxes.flatMap((a) => (a.r > innerWidth - 15 || a.l < 15 ? [`out ${a.n}`] : []))]
    })

    expect(bad, `${width}`).toEqual([])
  }

  expect(errors).toEqual([])
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the race takes the opposite theme and stays readable, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await loaded(page)

    await expect(guide(page, '.race')).toHaveAttribute('data-theme', colorScheme === 'light' ? 'dark' : 'light')

    const low = await guide(page, '.race .mono, .race .what, .race .body, .list p, .list .time, .next .caption p').evaluateAll((els) => {
      const channels = (c: string) => (c.match(/[\d.]+/g) ?? []).map((v) => (c.startsWith('color(') ? Number(v) * 255 : Number(v)))

      const light = (c: string) => {
        const [r = 0, g = 0, b = 0] = channels(c).map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))

        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }

      const behind = (el: Element | null): string => {
        if (!el) return 'rgb(255, 255, 255)'

        const c = getComputedStyle(el).backgroundColor

        return c === 'rgba(0, 0, 0, 0)' ? behind(el.parentElement) : c
      }

      return els.flatMap((el) => {
        const a = light(getComputedStyle(el).color)
        const b = light(behind(el))
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

        return ratio < 4.1 ? [`${el.textContent} ${ratio.toFixed(2)}`] : []
      })
    })

    expect(low).toEqual([])
    expect(errors).toEqual([])
  })
}

test('the ruler draws once and every moment arrives', async ({ page, errors }) => {
  await loaded(page)
  await guide(page, '.race .laps').scrollIntoViewIfNeeded()
  await scrollToEnd(page)

  expect(await guide(page, '.race li a, .race .tick').evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length)).toBe(0)
  expect(errors).toEqual([])
})
