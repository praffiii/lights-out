import { readFileSync } from 'node:fs'

import type { Page } from '@playwright/test'
import { Schema } from 'effect'

import { progressAt } from '../src/chapter/pace.ts'
import { ghostPace, START } from '../src/drs/model.ts'
import { GhostFile } from '../src/drs/schema.ts'
import { expect, hiddenText, LOADER_MS, NO_WEBGL, pinSpan, scrollTo, scrollToEnd, test } from './fixtures.ts'

const GHOST = Schema.decodeUnknownSync(Schema.fromJsonString(GhostFile))(readFileSync('src/drs/miami.json', 'utf8'))

const PATH = '/chapters/drs'

const loaded = async (page: Page, path = PATH) => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const chapter = (page: Page, selector: string) => page.locator(`.drs-page ${selector}`)

const ghost = (page: Page, selector = '') => page.locator(`.drs-page .ghost ${selector}`.trim())

const slider = (page: Page) => ghost(page, '[role="slider"]')

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

const numbers = (page: Page, selector: string) => chapter(page, selector).evaluateAll((els) => els.map((el) => (el instanceof HTMLElement ? (el.dataset.text ?? el.textContent) : '')))

const CHIPS = ['DRS · until 2025', 'Detection point', 'Activation point', 'Main plane', 'Flap', 'Drag', 'Safety car', 'Overtake Mode']

const pace = ghostPace(GHOST)

const toTime = async (page: Page, t: number) => {
  const { top, range } = await pinSpan(page, '.ghost')

  await scrollTo(page, top + range * Math.min(0.999, progressAt(pace, t - START)))
  await page.waitForTimeout(1600)
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(chapter(page, 'h1')).toHaveText('Fifteen seasonswith a flap.')
    await expect(page).toHaveTitle('DRS, 2011 to 2025 · Lights Out')
    await expect(chapter(page, '.opening .label')).toHaveText('How F1 works · Chapter 09 · 5 min')
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    expect(errors).toEqual([])
  })

  test(`the stage is dark and fits the screen, ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)
    await toTime(page, 2)
    await expect(ghost(page)).toHaveAttribute('data-theme', 'dark')

    const box = await ghost(page, '.pin').boundingBox()

    expect(box?.y ?? -1).toBeCloseTo(0, 0)
    expect(box?.height ?? Infinity).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1)
  })
}

test('nothing overflows, nothing stays hidden and every credit is filled', async ({ page, errors }) => {
  await loaded(page)
  await scrollToEnd(page)

  expect(await overflow(page)).toBeLessThanOrEqual(0)
  expect(await hiddenText(page, '.ghost')).toEqual([])

  for (const text of await chapter(page, '.credit').allTextContents()) expect(text.trim()).not.toBe('')
  expect(errors).toEqual([])
})

for (const width of [360, 768, 1024]) {
  test(`does not scroll sideways at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await loaded(page)
    await scrollToEnd(page)

    expect(await overflow(page)).toBeLessThanOrEqual(0)

    const right = await chapter(page, ':is(.years, .gain) .num').evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().right)))

    expect(right).toBeLessThanOrEqual(width)
  })
}

test('the years, the four straights and the rules say what the sources say', async ({ page }) => {
  await loaded(page)
  await scrollToEnd(page)

  expect(await numbers(page, '.years .num')).toEqual(['2011', '2025'])
  await expect(chapter(page, '.years li')).toHaveText([/First race.*Melbourne.*27 March 2011/, /First champion.*Sebastian Vettel.*Red Bull/, /Last race.*Yas Marina.*7 December 2025/, /Last to open it.*Kimi Antonelli.*On the last lap/])
  await expect(chapter(page, '.gain .num')).toHaveText(['+8', '+9', '+10', '+14 km/h'])
  await expect(chapter(page, '.gain li').last()).toHaveClass(/payoff/)
  await expect(chapter(page, '.how .step')).toHaveCount(3)
  await expect(chapter(page, '.how .payoff .what')).toHaveText('For a lap after the start or a safety car, and in poor visibility.')
  await expect(chapter(page, '.after a.more')).toHaveAttribute('href', '/chapters/overtaking')
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

test('it links back to 08, to every chapter and on to the season', async ({ page, errors }) => {
  await loaded(page)

  await expect(chapter(page, '.opening nav').getByRole('link', { name: /08 The two championships/ })).toHaveAttribute('href', '/chapters/championships')
  await expect(chapter(page, '.opening nav').getByRole('link', { name: 'All nine chapters' })).toHaveAttribute('href', '/chapters')
  await expect(chapter(page, '.next .read')).toHaveAttribute('href', '/season')
  expect(errors).toEqual([])
})

test('Home and Chapter 08 lead here', async ({ page, errors }) => {
  await page.goto('/')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
  await expect(page.locator('.chapters .head')).toContainText('Nine chapters · 52 min')
  await expect(page.locator('.rows li:nth-child(9) a')).toHaveAttribute('href', PATH)

  await loaded(page, '/chapters/championships')
  await expect(page.locator('.chapter-page .opening nav').getByRole('link', { name: /09 DRS, 2011 to 2025/ })).toHaveAttribute('href', PATH)
  await expect(page.locator('.chapter-page .next .read')).toHaveAttribute('href', PATH)
  expect(errors).toEqual([])
})

const atLine = async (page: Page) => {
  await expect(ghost(page, '.gap b')).toHaveText('Level')
  await expect(ghost(page, '.wing .state')).toHaveText('Flap · shut')
  await expect(ghost(page, '[data-speed="on"] .label')).toHaveText('Lap 53 · flap shut')
  await expect(ghost(page)).not.toHaveAttribute('data-open', '')
}

const atEnd = async (page: Page) => {
  await expect(ghost(page, '.gap b')).toHaveText(/^1[78] m$/)
  await expect(ghost(page, '.wing .state')).toHaveText('Flap · open')
  await expect(ghost(page, '[data-speed="on"] .num')).toHaveText(/^33[4-6]$/)
  await expect(ghost(page, '[data-speed="off"] .num')).toHaveText(/^31[5-8]$/)
  await expect(ghost(page)).toHaveAttribute('data-open', '')
}

test('the flap opens and the gap grows, and all of it goes back', async ({ page, errors }) => {
  await loaded(page)

  await toTime(page, -1)
  await atLine(page)
  await toTime(page, GHOST.end)
  await atEnd(page)
  await expect(ghost(page, '.marks [data-mark="end"]')).toHaveAttribute('data-lit', '')
  await toTime(page, -1)
  await atLine(page)
  expect(errors).toEqual([])
})

test('a fast jump over the line and back always matches', async ({ page }) => {
  await loaded(page)

  const { top, range } = await pinSpan(page, '.ghost')

  for (const share of [0.02, 0.999, 0.02, 0.6, 0.999, 0.02]) await scrollTo(page, top + range * share)

  await page.waitForTimeout(2000)
  await atLine(page)
})

test('the keys walk the straight and stop at the end of the zone', async ({ page }) => {
  await loaded(page)
  await toTime(page, 1)
  await slider(page).focus()
  await page.keyboard.press('End')
  await atEnd(page)

  const max = Number(await slider(page).getAttribute('aria-valuemax'))

  expect(Number(await slider(page).getAttribute('aria-valuenow'))).toBeCloseTo(max, -1)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(1500)
  expect(Number(await slider(page).getAttribute('aria-valuenow')) % 100).toBeLessThan(3)
  await page.keyboard.press('Home')
  await atLine(page)
})

test('a press on the bar goes there, and past the zone it stops at the end', async ({ page }) => {
  await loaded(page)
  await toTime(page, 1)

  const box = await slider(page).boundingBox()

  if (!box) throw new Error('no bar')

  await page.mouse.click(box.x + box.width * 0.99, box.y + box.height / 2)
  await atEnd(page)
})

test('no WebGL keeps the poster and the numbers', async ({ page }) => {
  await page.addInitScript(NO_WEBGL)
  await loaded(page)
  await toTime(page, GHOST.end)

  await expect(ghost(page, '[data-speed="on"] .num')).toHaveText(/^33[4-6]$/)
  await expect(ghost(page, '.poster')).toBeVisible()
  await expect(ghost(page, '.wing .state')).toHaveText('Flap · open')
})

test('reduced motion rests at the end and pins nothing', async ({ page, errors }) => {
  await loaded(page, `${PATH}?reduced`)

  expect(await page.locator('.pin-spacer').count()).toBe(0)
  expect(await hiddenText(page, '.ghost .stage')).toEqual([])
  await expect(ghost(page, '[data-speed="on"] .num')).toHaveText(/^33[4-6]$/)
  await slider(page).focus()
  await page.keyboard.press('Home')
  await expect(ghost(page, '.wing .state')).toHaveText('Flap · shut')
  expect(errors).toEqual([])
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the end state and the open wing are in the page', async ({ page }) => {
    await page.goto(PATH)

    await expect(ghost(page, '[data-speed="on"] .num')).toHaveText(/^33[4-6]$/)
    await expect(ghost(page, '.ahead')).toContainText(/1[78] m/)
    await expect(ghost(page, '.wing img')).toHaveAttribute('src', '/wing/open.webp')
  })
})

const FRAME = /\/wing\/\d\d\.webp/

const picture = (page: Page) => ghost(page, '.wing canvas').evaluate((el) => (el instanceof HTMLCanvasElement ? el.toDataURL() : ''))

const isBlank = (page: Page) => ghost(page, '.wing canvas').evaluate((el) => el instanceof HTMLCanvasElement && !el.getContext('2d')?.getImageData(0, 0, el.width, el.height).data.some((v) => v > 0))

test('the wing opens at the line and shuts on the way back', async ({ page, errors }) => {
  await loaded(page)
  await toTime(page, -1)
  await expect(ghost(page, '.wing canvas')).toHaveAttribute('data-frame', '0')

  const shut = await picture(page)

  await toTime(page, GHOST.end)
  await expect(ghost(page, '.wing canvas')).toHaveAttribute('data-frame', '23')
  expect(await picture(page)).not.toBe(shut)

  await toTime(page, -1)
  await expect(ghost(page, '.wing canvas')).toHaveAttribute('data-frame', '0')
  expect(await picture(page)).toBe(shut)
  expect(errors).toEqual([])
})

test('halfway through the opening the wing is between shut and open', async ({ page }) => {
  await loaded(page)
  await toTime(page, 0.15)

  const frame = Number(await ghost(page, '.wing canvas').getAttribute('data-frame'))

  expect(frame).toBeGreaterThan(3)
  expect(frame).toBeLessThan(20)
})

test('the wing frames wait until the stage is near', async ({ page }) => {
  const asked: string[] = []

  page.on('request', (r) => FRAME.test(r.url()) && asked.push(r.url()))
  await loaded(page)
  await page.waitForTimeout(1000)
  expect(asked).toEqual([])

  await toTime(page, 1)
  await expect.poll(() => asked.length).toBe(24)
})

test('with no frames the open wing stays', async ({ page }) => {
  await page.route(FRAME, (route) => route.abort())
  await loaded(page)
  await toTime(page, -1)
  await expect(ghost(page, '.wing img')).toBeHidden()
  await toTime(page, 2)

  await expect(ghost(page, '.wing img')).toBeVisible()
  expect(await isBlank(page)).toBe(true)
})

const clashes = (page: Page) =>
  ghost(page).evaluate((scope) => {
    const parts = [...scope.querySelectorAll('.title .label, .title .headline, .title .intro, .wing, .speeds, .straight, .racer > span, .gap')]

    const boxes = parts.flatMap((el) => {
      const r = el.getBoundingClientRect()

      return r.width > 0 && getComputedStyle(el).visibility === 'visible' ? [{ name: el.className || el.parentElement?.className || '', car: el.parentElement?.getAttribute('data-car') ?? '', r }] : []
    })

    const label = (b: { name: string; car: string }) => `${b.name}${b.car}`
    const out = boxes.flatMap((b) => (b.r.left < -0.5 || b.r.top < -0.5 || b.r.right > innerWidth + 0.5 || b.r.bottom > innerHeight + 0.5 ? [`${label(b)} off screen`] : []))

    const hits = boxes.flatMap((a, i) =>
      boxes.slice(i + 1).flatMap((b) => (a.r.left < b.r.right - 1 && b.r.left < a.r.right - 1 && a.r.top < b.r.bottom - 1 && b.r.top < a.r.bottom - 1 ? [`${label(a)} on ${label(b)}`] : [])),
    )

    const wide = [...scope.querySelectorAll('.marks li')].flatMap((li) => (li.getBoundingClientRect().right > innerWidth + 0.5 ? ['mark off screen'] : []))
    const marks = [...scope.querySelectorAll('.marks li')].map((li) => li.getBoundingClientRect())
    const [first, second] = marks
    const crowd = first && second && first.right > second.left && first.bottom > second.top + 1 && second.bottom > first.top + 1 ? ['marks overlap'] : []

    return [...out, ...hits, ...wide, ...crowd]
  })

for (const [project, width, height] of [
  ['desktop', 1440, 900],
  ['desktop', 1366, 768],
  ['desktop', 1366, 640],
  ['desktop', 1280, 700],
  ['desktop', 1280, 520],
  ['desktop', 1280, 560],
  ['desktop', 1000, 600],
  ['desktop', 1000, 660],
  ['desktop', 800, 520],
  ['desktop', 900, 600],
  ['desktop', 1024, 768],
  ['desktop', 820, 1180],
  ['desktop', 768, 1024],
  ['phone', 844, 390],
  ['phone', 390, 844],
  ['phone', 390, 664],
  ['phone', 360, 640],
  ['phone', 320, 568],
] as const) {
  test(`nothing in the stage clips or overlaps at ${width}×${height}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== project)
    await page.setViewportSize({ width, height })
    await loaded(page)

    for (const t of [START, 0, GHOST.end]) {
      await toTime(page, t)
      await expect(ghost(page, '.pass-hud')).toHaveAttribute('data-on', '')
      expect(await clashes(page)).toEqual([])
    }
  })
}

test.describe('with reduced motion asked for by the system', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('nothing in the stage fades or blinks', async ({ page }) => {
    await loaded(page)

    const moving = await ghost(page, ':is(.state, .num, .marks li, .gap, .title, .headline, .rec)').evaluateAll((els) => els.flatMap((el) => (getComputedStyle(el).transitionDuration === '0s' && getComputedStyle(el).animationName === 'none' ? [] : [el.className])))

    expect(moving).toEqual([])
  })
})

test('a lost WebGL context leaves the numbers working', async ({ page }) => {
  await loaded(page)
  await toTime(page, -1)
  await expect(ghost(page, '.pass-hud')).toHaveAttribute('data-on', '')
  await ghost(page, '.gl canvas').evaluate((el) => {
    if (el instanceof HTMLCanvasElement) el.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext()
  })
  await toTime(page, GHOST.end)
  await expect(ghost(page, '[data-speed="on"] .num')).toHaveText(/^33[4-6]$/)
  await expect(ghost(page, '.wing .state')).toHaveText('Flap · open')
  await expect(ghost(page, '.gap b')).toHaveText(/^1[78] m$/)
})

test('the frame the stage needs is asked for before the rest', async ({ page }) => {
  const asked: string[] = []
  let release = () => {}

  const held = new Promise<void>((resolve) => {
    release = resolve
  })

  await page.route(FRAME, async (route) => {
    asked.push(route.request().url())
    await held
    await route.continue()
  })
  await loaded(page)
  await toTime(page, -1)
  expect(asked.map((url) => url.slice(-7))).toEqual(['00.webp'])
  release()
  await expect.poll(() => asked.length).toBe(24)
})

test('the bar label is bright enough over the road', async ({ page }) => {
  await loaded(page)
  await expect(ghost(page, '.straight .label')).toHaveCSS('color', 'rgb(255, 255, 255)')
})

for (const [project, width, height] of [
  ['desktop', 1366, 640],
  ['desktop', 1280, 700],
  ['desktop', 1000, 720],
  ['phone', 844, 390],
  ['phone', 390, 844],
  ['phone', 320, 568],
] as const) {
  test(`with no WebGL nothing in the stage clips or overlaps at ${width}×${height}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== project)
    await page.addInitScript(NO_WEBGL)
    await page.setViewportSize({ width, height })
    await loaded(page)
    await toTime(page, GHOST.end)

    await expect(ghost(page, '.ahead')).toBeVisible()
    expect(await clashes(page)).toEqual([])
  })
}
