import type { Page } from '@playwright/test'

import { expect, LOADER_MS, stubPole, stubSeason, test } from './fixtures.ts'

const loaded = async (page: Page, path: string) => {
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const toBand = async (page: Page) => {
  await page.locator('.sizes .head').scrollIntoViewIfNeeded()
  await page.locator('.sizes-note').scrollIntoViewIfNeeded()
}

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the index shows every circuit at one scale with the next race lit, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page, '/tracks')
    await toBand(page)

    await expect(page).toHaveTitle('The tracks · Lights Out')
    await expect(page.locator('.tracks-page h1')).toContainText('tracks this')
    await expect(page.locator('.sizes .cell').filter({ visible: true })).toHaveCount(23)
    await expect(page.locator('.sizes .chip').filter({ visible: true })).toHaveText(/^(20 · Interlagos · 4\.309 km|20 Interlagos)$/)
    await expect(page.locator('.sizes img.patch').filter({ visible: true })).toHaveAttribute('src', /-br-1940\.webp$/)
    const links = page.locator('.sizes a.cell').filter({ visible: true })
    await expect(links).toHaveCount(2)
    await expect(links.nth(0)).toHaveAttribute('href', '/tracks/vegas')
    await expect(links.nth(1)).toHaveAttribute('href', '/tracks/losail')
    await expect(page.getByText('Pick a track with → to open it')).toBeVisible()
    await expect(page.locator('.sizes')).toHaveCSS('background-color', 'rgb(6, 8, 14)')
    expect(await noOverflow(page)).toBe(true)
    expect(errors).toEqual([])
  })
}

test('with no season data nothing is lit and every label is plain', async ({ page }) => {
  await stubSeason(page, { status: 500, body: '' })
  await loaded(page, '/tracks')
  await toBand(page)

  await expect(page.locator('.sizes .cell').filter({ visible: true })).toHaveCount(23)
  await expect(page.locator('.sizes .chip')).toHaveCount(0)
  await expect(page.locator('.sizes img.patch')).toHaveCount(0)
})

test('the hero facts come from the calendar', async ({ page }) => {
  await loaded(page, '/tracks')

  await expect(page.locator('.tracks-page .facts dd')).toHaveText([/Spa\s*7\.004 km/, /Monaco\s*3\.337 km/, /Madring\s*Madrid, 2026/])
})

test('the menu leads to the tracks', async ({ page, errors }) => {
  await loaded(page, '/')
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.locator('.menu nav .line > a', { hasText: 'The tracks' }).click()

  await expect(page).toHaveURL(/\/tracks$/)
  await expect(page.locator('.tracks-page h1')).toContainText('tracks this')
  expect(errors).toEqual([])
})

const trackStage = (page: Page) => page.locator('.track-page .band .stage')

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the Las Vegas page reads the lap from the stored pole lap, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await stubPole(page, 'vegas')
    await loaded(page, '/tracks/vegas')

    await expect(page).toHaveTitle('Las Vegas · The tracks · Lights Out')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Las Vegas.')
    await expect(page.getByText('The tracks · Round 21 · United States')).toBeVisible()
    await page.locator('.braking').scrollIntoViewIfNeeded()
    await expect(page.getByText('Six stops.')).toBeVisible()
    await expect(page.locator('.braking .stat').first()).toContainText('327')
    await expect(page.getByText(/Norris's pole lap, 2025, 1:47\.934/)).toBeVisible()
    await expect(page.locator('.braking .wet')).toHaveText('Wet')
    await expect(page.getByText(/from Turn 12 to Turn 14/)).toBeVisible()
    await expect(page.getByText('Seventeen turns.')).toBeVisible()
    expect(await noOverflow(page)).toBe(true)
    expect(errors).toEqual([])
  })
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the Lusail page reads the lap from the stored pole lap, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await stubPole(page, 'losail')
    await loaded(page, '/tracks/losail')

    await expect(page).toHaveTitle('Lusail · The tracks · Lights Out')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lusail.')
    await expect(page.getByText('The tracks · Round 22 · Qatar')).toBeVisible()
    await expect(page.locator('.place')).toHaveText(['Fast rights · T12–14, no braking'])
    await expect(page.getByText('Sixteen turns.')).toBeVisible()
    await page.locator('.braking').scrollIntoViewIfNeeded()
    await expect(page.getByText('Seven stops.')).toBeVisible()
    await expect(page.locator('.braking .stat').first()).toContainText('250')
    await expect(page.getByText(/Piastri's pole lap, 2025, 1:19\.387/)).toBeVisible()
    await expect(page.locator('.braking .wet')).toHaveCount(0)
    await expect(page.getByText(/from Turn 10 to Turn 16/)).toBeVisible()
    expect(await noOverflow(page)).toBe(true)
    expect(errors).toEqual([])
  })
}

for (const id of ['vegas', 'losail']) {
  test(`the ${id} place tags sit inside the band, clear of the replay`, async ({ page, errors }) => {
    await stubPole(page, id)
    await loaded(page, `/tracks/${id}`)
    await trackStage(page).scrollIntoViewIfNeeded()
    await expect(trackStage(page)).toHaveAttribute('data-gl', '', { timeout: 20_000 })
    await expect(page.locator('.circuit .replay')).toBeVisible()

    const misplaced = await page.evaluate(() => {
      const stage = document.querySelector('.track-page .band .stage')?.getBoundingClientRect()
      const replay = [...document.querySelectorAll('.circuit .replay > *')].map((el) => el.getBoundingClientRect())

      return [...document.querySelectorAll('.place b')].flatMap((tag) => {
        const box = tag.getBoundingClientRect()
        const inside = stage && box.left >= stage.left && box.right <= stage.right && box.top >= stage.top
        const clear = replay.every((r) => box.right + 12 <= r.left || box.left - 12 >= r.right || box.bottom + 12 <= r.top || box.top - 12 >= r.bottom)

        return inside && clear ? [] : [tag.textContent]
      })
    })

    expect(misplaced).toEqual([])
    expect(errors).toEqual([])
  })
}

test('the braking numbers roll in once the pole lap arrives', async ({ page, errors }) => {
  await stubPole(page, 'vegas')
  await loaded(page, '/tracks/vegas')
  await page.locator('.braking').scrollIntoViewIfNeeded()

  await expect(page.locator('.braking .num').first()).toHaveAttribute('data-text', '327')
  await expect(page.locator('.braking .num .sr').first()).toHaveText('327')
  expect(errors).toEqual([])
})

test('with no pole lap there is no braking section and the band still draws', async ({ page, errors }) => {
  await stubPole(page, null)
  await loaded(page, '/tracks/vegas')
  await trackStage(page).scrollIntoViewIfNeeded()

  await expect(trackStage(page)).toHaveAttribute('data-gl', '', { timeout: 20_000 })
  await expect(page.locator('.braking')).toHaveCount(0)
  await expect(page.getByText(/longest run without braking/)).toHaveCount(0)
  await expect(page.getByText('Three timed sectors: S1 purple, S2 green, S3 yellow.')).toBeVisible()
  expect(errors).toEqual([])
})

test('the place tags ride the model and both toggles work', async ({ page, errors }) => {
  await loaded(page, '/tracks/vegas')
  await trackStage(page).scrollIntoViewIfNeeded()
  await expect(trackStage(page)).toHaveAttribute('data-gl', '', { timeout: 20_000 })

  const box = await trackStage(page).boundingBox()
  const tag = await page.locator('.place', { hasText: 'The Strip' }).boundingBox()

  expect((tag?.x ?? 0) - (box?.x ?? 0)).toBeGreaterThan(40)
  expect((tag?.y ?? 0) - (box?.y ?? 0)).toBeGreaterThan(40)

  await page.getByRole('button', { name: 'Turns' }).click()
  await expect(trackStage(page)).toHaveAttribute('data-turns', 'off')
  await page.getByRole('button', { name: 'Sectors' }).click()
  await expect(trackStage(page)).toHaveAttribute('data-sectors', 'off')
  expect(errors).toEqual([])
})

test('an unknown track shows the missing section', async ({ page }) => {
  await loaded(page, '/tracks/nope')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('No page for this track yet')
  await expect(page.getByRole('link', { name: 'All the tracks' })).toHaveAttribute('href', '/tracks')
})

for (const [id, name] of [
  ['vegas', 'Las Vegas'],
  ['losail', 'Lusail'],
] as const) {
  test(`every photo on the ${name} page is credited`, async ({ page }) => {
    await loaded(page, `/tracks/${id}`)

    const missing = await page.evaluate(() =>
      [...document.querySelectorAll('main img')].flatMap((img) =>
        img.closest('.stage, .sizes') || /Public domain|CC/.test(img.closest('figure, section')?.querySelector('.credit')?.textContent ?? '') ? [] : [img.getAttribute('src')],
      ),
    )

    expect(await page.locator('main img:not(.stage img, .sizes img)').count()).toBeGreaterThanOrEqual(5)
    expect(missing).toEqual([])
  })
}
