import type { Page } from '@playwright/test'

import { expect, LOADER_MS, test } from './fixtures.ts'

const IDS = { interlagos: 'Interlagos', vegas: 'Las Vegas', losail: 'Lusail', yas_marina: 'Yas Marina', albert_park: 'Albert Park' } as const

const lifted = (page: Page) => expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })

const open = async (page: Page, path: string) => {
  await page.goto(path)
  await lifted(page)
}

const explore = async (page: Page) => {
  const link = page.getByText('Explore the lap in 3D')

  await page.mouse.move(700, 300)
  await expect(async () => {
    await page.mouse.wheel(0, 600)
    await expect(link).toBeVisible({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  await link.click()
}

test('the band opens the lap explorer for its circuit', async ({ page, errors }) => {
  await open(page, '/weekend')
  await explore(page)
  await expect(page).toHaveURL(/\/lap\/interlagos$/)
  await expect(page.locator('h1')).toHaveText('Interlagos')
  await expect(page.locator('.header, .footer, .menu')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('close and Escape go back to the weekend page', async ({ page, errors }) => {
  await open(page, '/weekend')
  await explore(page)
  await expect(page.locator('h1')).toHaveText('Interlagos')
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/weekend\/?$/)
  await explore(page)
  await expect(page.locator('h1')).toHaveText('Interlagos')
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page).toHaveURL(/\/weekend\/?$/)
  expect(errors).toEqual([])
})

test('a direct visit closes to the weekend page', async ({ page, errors }) => {
  await open(page, '/lap/vegas')
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page).toHaveURL(/\/weekend\/?$/)
  await expect(page.locator('.header')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('every circuit has its own lap page', async ({ page, errors }) => {
  test.setTimeout(90_000)

  for (const [id, name] of Object.entries(IDS)) {
    await open(page, `/lap/${id}`)
    await expect(page.locator('h1')).toHaveText(name)
  }

  expect(errors).toEqual([])
})

test('an unknown circuit says there is no 3D lap yet', async ({ page }) => {
  await open(page, '/lap/monaco')
  await expect(page.getByText('No 3D lap for this circuit yet')).toBeVisible()
  await expect(page.locator('a[href="/weekend"]')).toBeVisible()
})

test('the wheel never scrolls the lap page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await open(page, '/lap/vegas')
  await page.mouse.move(400, 400)
  await page.mouse.wheel(0, 2000)
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => scrollY)).toBe(0)
})

const drive = async (page: Page, path = '/lap/vegas') => {
  await open(page, path)
  await expect(page.locator('.lap')).toHaveAttribute('data-ready', '', { timeout: 20_000 })
  await page.mouse.move(700, 400)
}

const km = async (page: Page) => Number(await page.locator('[data-km]').textContent())

const thrown = (errors: string[]) => errors.filter((e) => e.startsWith('pageerror'))

test('opens at the requested point', async ({ page, errors }) => {
  await drive(page, '/lap/vegas?at=0.5')

  await expect(page.locator('[data-km]')).toHaveText(/^(2\.9|3\.[0-2])\d$/)
  expect(thrown(errors)).toEqual([])
})

test('ignores a bad at', async ({ page, errors }) => {
  await drive(page, '/lap/vegas?at=1.5')

  await expect(page.locator('[data-km]')).toHaveText(/^0\.[0-2]\d$/)
  expect(thrown(errors)).toEqual([])
})

test('cruises by itself once the loader lifts', async ({ page, errors }) => {
  await drive(page)
  await page.clock.runFor(2000)
  await expect(page.locator('.lap')).toHaveAttribute('data-mode', 'auto')

  const before = await km(page)

  await page.clock.runFor(3000)
  expect(await km(page)).toBeGreaterThan(before)
  expect(thrown(errors)).toEqual([])
})

test('a scroll takes the wheel and the light holds still', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await drive(page)

  const start = await km(page)

  await page.mouse.wheel(0, 1400)
  await expect
    .poll(async () => {
      const before = await km(page)

      await page.clock.runFor(1000)

      const after = await km(page)

      return after > start + 1 && after === before
    })
    .toBe(true)

  const held = await km(page)

  await page.clock.runFor(3000)
  expect(await km(page)).toBe(held)
  await expect(page.locator('.lap')).toHaveAttribute('data-mode', 'you')
})

test('tapping a turn number glides to that corner', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await drive(page)
  await page.locator('.lap .ticks button', { hasText: /^05$/ }).click()
  await page.clock.runFor(2000)
  await expect(page.locator('.lap .callout')).toContainText('T05')
})

test('the right arrow glides to the next turn', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await drive(page)
  await page.mouse.wheel(0, 100)
  await page.keyboard.press('ArrowRight')
  await page.clock.runFor(2000)
  await expect(page.locator('.lap .callout')).toBeVisible()
})

test('Resume hands the lap back to auto', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await drive(page)
  await page.mouse.wheel(0, 1400)
  await page.clock.runFor(1000)
  await page.locator('.lap .mode').click()
  await expect(page.locator('.lap')).toHaveAttribute('data-mode', 'auto')

  const before = await km(page)

  await page.clock.runFor(3000)
  expect(await km(page)).toBeGreaterThan(before)
})

test('scrolling back across the line wraps to the end of the lap', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'wheel, keys and the wide timeline are desktop input')
  await drive(page)
  await page.mouse.wheel(0, -1400)
  await page.clock.runFor(2000)
  await expect(page.locator('[data-sector]')).toHaveText('S3')
  expect(await km(page)).toBeGreaterThan(3)
})

test('a second visit cruises at the normal pace', async ({ page, errors }) => {
  await open(page, '/weekend')
  await explore(page)
  await expect(page.locator('.lap')).toHaveAttribute('data-ready', '', { timeout: 20_000 })
  await page.clock.runFor(2000)
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/weekend\/?$/)
  await explore(page)
  await expect(page.locator('.lap')).toHaveAttribute('data-ready', '', { timeout: 20_000 })
  await page.clock.runFor(2000)

  const before = await km(page)

  await page.clock.runFor(3000)
  expect(await km(page)).toBeGreaterThan(before)
  expect(thrown(errors)).toEqual([])
})

test('reduced motion opens still on the overhead view', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the tick tap needs the wide timeline')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await drive(page)
  await page.clock.runFor(3000)
  await expect(page.locator('.lap')).toHaveAttribute('data-mode', 'you')
  await expect(page.locator('[data-km]')).toHaveText('0.00')
  await page.locator('.lap .ticks button', { hasText: /^05$/ }).click()
  await page.clock.runFor(100)
  await expect(page.locator('.lap .callout')).toContainText('T05')
})

test('a phone swipes to drive and loads the small map', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch input')

  const maps: string[] = []

  page.on('request', (request) => {
    if (request.url().includes('-map')) maps.push(request.url())
  })
  await drive(page)
  await expect(page.locator('.lap .hint')).toHaveText('Swipe to drive · Tap a number to jump')
  expect(maps.some((url) => url.endsWith('-map-2048.webp'))).toBe(true)
  expect(maps.some((url) => url.endsWith('-map.webp'))).toBe(false)
  expect(await page.locator('.lap').evaluate((el) => getComputedStyle(el).touchAction)).toBe('none')

  const cdp = await page.context().newCDPSession(page)
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 195, y }] })

  await touch('touchStart', 500)

  for (const y of [460, 420, 380, 340, 300]) await touch('touchMove', y)

  await touch('touchEnd', 300)
  await expect(page.locator('.lap')).toHaveAttribute('data-mode', 'you')
  await page.locator('.lap .ticks button', { hasText: /^05$/ }).tap()
  await page.clock.runFor(2000)
  await expect(page.locator('.lap .callout')).toContainText('T05')
})

test('rotating mid-lap keeps the light and the HUD', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'rotation is a phone case')
  await drive(page)
  await page.clock.runFor(3000)

  const before = await km(page)

  await page.setViewportSize({ width: 844, height: 390 })
  await page.clock.runFor(1500)
  expect(await km(page)).toBeGreaterThan(before)
  expect(await page.locator('.lap canvas').evaluate((el) => el.clientWidth)).toBe(844)
  await expect(page.locator('.lap .mode')).toBeInViewport()
  expect(thrown(errors)).toEqual([])
})

test('keeps the poster when the model never loads', async ({ page, errors }) => {
  await page.route('**/circuits/*.glb', () => new Promise<void>(() => {}))
  await open(page, '/lap/vegas')
  await expect(page.locator('.lap .poster')).toBeVisible()
  await expect(page.locator('h1')).toHaveText('Las Vegas')
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page).toHaveURL(/\/weekend\/?$/)
  expect(thrown(errors)).toEqual([])
})

test('says the 3D lap could not load when the model fails', async ({ page }) => {
  await page.route('**/circuits/*.glb', (route) => route.abort())
  await open(page, '/lap/vegas')
  await expect(page.getByText('The 3D lap could not load.')).toBeVisible()
  await expect(page.locator('.lap .poster')).toBeVisible()
})

test('no two turn numbers on the timeline overlap', async ({ page }) => {
  test.setTimeout(120_000)

  for (const id of Object.keys(IDS)) {
    await drive(page, `/lap/${id}`)

    const clashes = await page.locator('.lap .ticks').evaluate((ticks) => {
      const boxes = [...ticks.querySelectorAll('button:not(.crowd)')].flatMap((b) => {
        const range = document.createRange()

        range.selectNodeContents(b)

        return [{ n: b.textContent, r: range.getBoundingClientRect() }]
      })

      return boxes.flatMap((a, i) => boxes.slice(i + 1).flatMap((b) => (a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom && b.r.top < a.r.bottom ? [`${a.n}/${b.n}`] : [])))
    })

    expect(clashes, id).toEqual([])
  }
})

test('the title and callout keep their expanded display type', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one type check is enough')
  await drive(page)
  await page.locator('.lap .ticks button', { hasText: /^05$/ }).click()
  await page.clock.runFor(2000)

  const type = (selector: string) => page.locator(selector).evaluate((el) => `${getComputedStyle(el).fontFamily} ${getComputedStyle(el).fontSize}`)

  expect(await type('.lap h1')).toBe('Archivo, sans-serif 44px')
  expect(await type('.lap .callout span')).toBe('Archivo, sans-serif 84px')
})

test('the title, readouts, close and callout never overlap at any size', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'sizes are set per step')
  test.setTimeout(90_000)
  await drive(page, '/lap/albert_park')
  await page.locator('.lap .ticks button', { hasText: /^03$/ }).click()
  await page.clock.runFor(2000)

  for (const [width, height] of [[1470, 830], [1024, 768], [820, 1180], [768, 1024], [390, 844], [844, 390], [740, 360], [667, 375]] as const) {
    await page.setViewportSize({ width, height })
    await page.clock.runFor(500)

    const clashes = await page.locator('.lap').evaluate((lap) => {
      const parts = ['h1', '.read', '.close', '.callout span'].flatMap((selector) => {
        const el = lap.querySelector(selector)

        return el ? [{ selector, r: el.getBoundingClientRect() }] : []
      })

      return parts.flatMap((a, i) => parts.slice(i + 1).flatMap((b) => (a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom && b.r.top < a.r.bottom ? [`${a.selector}/${b.selector}`] : [])))
    })

    expect(clashes, `${width}×${height}`).toEqual([])
  }
})

test('closing returns to where the visitor left the weekend page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one return check is enough')
  await open(page, '/weekend')

  const link = page.getByText('Explore the lap in 3D')

  await page.mouse.move(700, 300)
  await expect(async () => {
    await page.mouse.wheel(0, 600)
    await expect(link).toBeInViewport({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  await page.waitForTimeout(800)

  const left = await page.evaluate(() => scrollY)

  await link.click()
  await expect(page.locator('.lap h1')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/weekend\/?$/)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(left - 80)
  await expect(link).toBeInViewport()
})

test('a turn next to another one calls out its own number', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the tick tap needs the wide timeline')
  await drive(page)

  for (const turn of ['02', '08', '16']) {
    await page.locator('.lap .ticks button', { hasText: new RegExp(`^${turn}$`) }).click()
    await page.clock.runFor(2000)
    await expect(page.locator('.lap .callout span')).toHaveText(`T${turn}`)
  }
})

test('the band dives into the explorer and closing shrinks back into the band', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one transition check is enough')
  await open(page, '/weekend')

  const link = page.getByText('Explore the lap in 3D')
  const veil = page.locator('.veil')

  await page.mouse.move(700, 300)
  await expect(async () => {
    await page.mouse.wheel(0, 600)
    await expect(link).toBeInViewport({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  await page.waitForTimeout(800)
  await link.click()
  await expect(veil).toBeVisible()
  await expect(page.locator('.lap h1')).toBeVisible()
  await expect(veil).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(veil).toBeVisible()
  await expect(veil).toBeHidden()
  await expect(link).toBeInViewport()
  expect(thrown(errors)).toEqual([])
})

test('closing during the dive still shrinks back into the band', async ({ page, errors }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one transition check is enough')
  await page.addInitScript(() => {
    let lap = false
    let back = 0

    const watch = () => {
      const root = document.documentElement
      const veil = document.querySelector('.veil')

      if (location.pathname.startsWith('/lap/')) lap = true
      else if (lap && back === 0) back = performance.now()

      if (back > 0 && veil && getComputedStyle(veil).visibility === 'hidden' && root.dataset.shrinkMs === undefined) root.dataset.shrinkMs = String(Math.round(performance.now() - back))

      requestAnimationFrame(watch)
    }

    requestAnimationFrame(watch)
  })
  await open(page, '/weekend')

  const link = page.getByText('Explore the lap in 3D')

  await page.mouse.move(700, 300)
  await expect(async () => {
    await page.mouse.wheel(0, 600)
    await expect(link).toBeInViewport({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  await page.waitForTimeout(800)
  await link.click()
  await expect(page.locator('.lap h1')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('html')).toHaveAttribute('data-shrink-ms', /\d/, { timeout: 10_000 })
  expect(Number(await page.locator('html').getAttribute('data-shrink-ms'))).toBeGreaterThan(700)
  expect(thrown(errors)).toEqual([])
})
