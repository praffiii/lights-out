import { readFileSync } from 'node:fs'

import type { Page } from '@playwright/test'

import { expect, LOADER_MS, test } from './fixtures.ts'

const current = '.tracker [aria-current="true"]'

const lifted = (page: Page) => expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

test('freezes the lap while the tab is hidden and resumes without skipping cars', async ({ page, errors }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await lifted(page)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'PIA')
  await page.evaluate(setHidden, true)
  await page.clock.runFor(30_000)
  await page.evaluate(setHidden, false)
  await expect(page.locator(current)).toHaveAttribute('data-code', /PIA|NOR/)
  expect(errors).toEqual([])
})

test('shows car 01, filled sectors and no light under reduced motion', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await lifted(page)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'PIA')
  await expect(page.locator('.hero .tag')).toBeHidden()
  await page.getByRole('button', { name: 'Show Lando Norris, McLaren MCL40' }).click()
  await expect(page.locator('.tracker .driver')).toHaveText('Lando Norris')
  expect(errors).toEqual([])
})

test('Pause stops the gallery', async ({ page, errors }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await lifted(page)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-pressed', 'true')
  await page.clock.runFor(20_000)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'PIA')
  expect(errors).toEqual([])
})

test('keeps the gallery running with no circuit when the season API is warming', async ({ page, errors }) => {
  await page.route('**/api/season', (r) => r.fulfill({ status: 503, json: { status: 'warming' } }))
  test.setTimeout(90_000)
  await page.goto('/')
  await lifted(page)
  await expect(page.locator('.tracker')).toBeVisible()
  await expect(page.locator('.hero canvas')).toHaveCount(0)
  await page.clock.runFor(17_000)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'NOR')
  expect(errors.filter((e) => !e.includes('503'))).toEqual([])
})

const lapBar = (page: Page) => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.tracker .lap') ?? document.body).transform).a)

test('a car picked mid-lap starts its lap from the line', async ({ page, errors }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await lifted(page)
  await expect(page.locator('.hero .stage[data-gl]')).toHaveCount(1)
  await page.clock.runFor(3_000)
  expect(await lapBar(page)).toBeGreaterThan(0.1)
  await page.getByRole('button', { name: 'Show Max Verstappen, Red Bull RB22' }).click()
  await page.clock.runFor(300)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'VER')
  expect(await lapBar(page)).toBeLessThan(0.06)
  expect(errors).toEqual([])
})

test('keeps the lap running on a phone when the circuit arrives after the page loaded', async ({ page, errors }) => {
  test.setTimeout(90_000)
  await page.route('**/api/season', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3_000))
    await route.fallback()
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.hero .stage[data-gl]')).toHaveCount(1, { timeout: 20_000 })
  await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.hero')

    if (hero) scrollTo(0, hero.offsetTop + hero.offsetHeight - 120)
  })
  await page.clock.runFor(17_000)
  await expect(page.locator(current)).toHaveAttribute('data-code', 'NOR')
  expect(errors).toEqual([])
})

const t1InStage = (page: Page) =>
  page.evaluate(() => {
    const pin = document.querySelector('[data-pin="turn-1"]')?.getBoundingClientRect()
    const stage = document.querySelector('.hero .stage')?.getBoundingClientRect()

    return pin && stage ? [Math.round(pin.x - stage.x), Math.round(pin.y - stage.y)] : null
  })

test('the track holds its framing while the page scrolls', async ({ page, errors }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await lifted(page)
  await expect(page.locator('.hero .stage[data-gl]')).toHaveCount(1)
  await page.clock.runFor(300)

  const before = await t1InStage(page)

  await page.evaluate(() => scrollTo(0, 400))
  await page.clock.runFor(600)
  expect(await t1InStage(page)).toEqual(before)
  expect(errors).toEqual([])
})

const withCircuit = (page: Page, id: string) =>
  page.route('**/api/season', async (route) => {
    const body = readFileSync('test/fixtures/season-snapshot.json', 'utf8').replace('"circuitId": "interlagos"', `"circuitId": "${id}"`)

    await route.fulfill({ status: 200, contentType: 'application/json', body })
  })

const pinsBelowFacts = (page: Page) =>
  page.evaluate(() => {
    const facts = document.querySelector('.hero .facts')?.getBoundingClientRect().top ?? 0

    return [...document.querySelectorAll('.hero .pins > span')].flatMap((pin) => (pin.getBoundingClientRect().bottom > facts ? [pin.textContent] : []))
  })

const pinsOverGallery = (page: Page) =>
  page.evaluate(() => {
    const gallery = [...document.querySelectorAll('.hero .tracker > *')].map((el) => el.getBoundingClientRect())

    return [...document.querySelectorAll('.hero .pins > span')].flatMap((pin) => {
      const p = pin.getBoundingClientRect()

      return gallery.some((g) => p.left < g.right && p.right > g.left && p.top < g.bottom && p.bottom > g.top) ? [pin.textContent] : []
    })
  })

for (const id of ['interlagos', 'vegas', 'losail', 'yas_marina', 'albert_park']) {
  test(`keeps the ${id} track above the facts and clear of the gallery on desktop`, async ({ page, errors }, info) => {
    test.skip(info.project.name === 'phone', 'the phone stacks the facts under the track')
    test.setTimeout(90_000)
    await withCircuit(page, id)
    await page.goto('/')
    await lifted(page)
    await expect(page.locator('.hero .stage[data-gl]')).toHaveCount(1)
    await page.clock.runFor(300)
    expect(await pinsBelowFacts(page)).toEqual([])
    expect(await pinsOverGallery(page)).toEqual([])
    expect(errors).toEqual([])
  })
}

test('keeps the poster pins above the facts when the circuit model never loads', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'the phone stacks the facts under the track')
  await withCircuit(page, 'losail')
  await page.route('**/circuits/*.glb', () => new Promise(() => {}))
  await page.goto('/')
  await lifted(page)
  await expect(page.locator('.hero .poster')).toBeVisible()
  await expect(page.locator('.hero .pins > span').first()).toBeVisible()
  expect(await pinsBelowFacts(page)).toEqual([])
})

test('the first turn reads 01 on a chip above a ring', async ({ page, errors }) => {
  await page.goto('/')
  await lifted(page)

  const t1 = page.locator('.hero [data-pin="turn-1"]')

  await expect(t1.locator('b')).toHaveText('01')
  expect(await t1.evaluate((el) => getComputedStyle(el, '::after').borderRadius)).toBe('50%')
  expect(errors).toEqual([])
})

test.describe('a phone held sideways', () => {
  test.use({ viewport: { width: 932, height: 430 }, screen: { width: 932, height: 430 } })

  test('still loads the small map', async ({ page, errors }, info) => {
    test.skip(info.project.name !== 'phone')

    const maps: string[] = []

    page.on('request', (r) => {
      if (r.url().includes('-map')) maps.push(new URL(r.url()).pathname)
    })
    await page.goto('/')
    await lifted(page)
    await expect(page.locator('.hero .stage[data-gl]')).toHaveCount(1)

    expect(maps).toEqual(['/circuits/br-1940-map-2048.webp'])
    expect(errors).toEqual([])
  })
})

test('a phone loads the small map and credits it', async ({ page, errors }, info) => {
  test.skip(info.project.name !== 'phone')

  const maps: string[] = []

  page.on('request', (r) => {
    if (r.url().includes('-map')) maps.push(new URL(r.url()).pathname)
  })
  await page.goto('/')
  await lifted(page)
  await expect(page.locator('.hero .stage[data-gl]')).toHaveCount(1)

  expect(maps).toEqual(['/circuits/br-1940-map-2048.webp'])
  await expect(page.locator('.hero .note')).toContainText('Map © OpenStreetMap contributors (ODbL)')
  await expect(page.locator('.hero .note')).not.toContainText('Contours')
  expect(errors).toEqual([])
})

test('keeps the poster when the map never loads', async ({ page, errors }) => {
  await page.route('**/circuits/*-map*.webp', () => new Promise(() => {}))
  await page.goto('/')
  await lifted(page)
  await expect(page.locator('.hero .poster')).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(page.locator('.hero .poster')).toBeVisible()
  expect(errors).toEqual([])
})

for (const width of [320, 390, 760, 1470]) {
  test(`has no horizontal overflow and keeps the T1 pin above the tag at ${width}px`, async ({ page, errors }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await expect(page.locator('.tracker')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    await expect(page.locator('.hero .stage[data-gl]')).toHaveCount(1)
    await lifted(page)
    await page.getByRole('button', { name: 'Pause' }).click()
    await page.addStyleTag({ content: '.hero .pins > span, .hero .tag { pointer-events: auto !important }' })

    const pinOnTop = await page.evaluate(() => {
      const pin = document.querySelector<HTMLElement>('[data-pin="turn-1"]')
      const tag = document.querySelector<HTMLElement>('.hero .tag')
      const stage = document.querySelector<HTMLElement>('.hero .stage')

      if (!pin || !tag || !stage) return 'missing'

      pin.scrollIntoView({ block: 'center' })

      const p = pin.getBoundingClientRect()
      const t = tag.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      const x = p.x + p.width / 2
      const y = p.y + p.height / 2

      tag.style.transform = `translate(${x - s.x + t.width / 2}px, ${y - s.y - t.height / 2}px)`

      const hit = document.elementFromPoint(x, y)

      return hit?.closest('[data-pin="turn-1"]') === pin ? 'turn-1' : `${hit?.tagName ?? 'nothing'}.${hit?.className ?? ''} at ${Math.round(x)},${Math.round(y)}`
    })

    expect(pinOnTop).toBe('turn-1')
    expect(errors).toEqual([])
  })
}
