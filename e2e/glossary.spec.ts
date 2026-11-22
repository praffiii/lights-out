import type { Page } from '@playwright/test'

import { expect, LOADER_MS, stubSeason, test } from './fixtures.ts'

const loaded = async (page: Page, path = '/glossary') => {
  await stubSeason(page)
  await page.goto(path)
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
}

const rows = (page: Page) => page.locator('.glossary-page .list li')

const row = (page: Page, key: string) => page.locator(`.glossary-page .list li[id="${key}"]`)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page)

    await expect(page.locator('.glossary-page h1')).toHaveText('Every word,in plain English.')
    await expect(page).toHaveTitle('Glossary · Lights Out')
    await expect(page.locator('.glossary-page .opening .label')).toHaveText('Glossary · 53 words · from 6 chapters')
    await expect(rows(page)).toHaveCount(53)
    await expect(page.locator('.glossary-page .next .hl').first()).toHaveCSS('display', 'block')
    await expect(page.locator('.glossary-page .next img')).toHaveAttribute('srcset', /3543w/)
    expect(errors).toEqual([])
  })
}

test('search narrows the list, says when nothing matches, and comes back', async ({ page, errors }) => {
  await loaded(page)

  const search = page.getByRole('searchbox', { name: 'Search' })

  await search.fill('undercut')
  await expect(row(page, 'undercut')).toBeVisible()
  await expect(row(page, 'pole')).toHaveCount(0)

  await search.fill('zzz')
  await expect(rows(page)).toHaveCount(0)
  await expect(page.locator('.glossary-page .none')).toHaveText('No word matches “zzz”.')

  await search.fill('')
  await expect(rows(page)).toHaveCount(53)
  expect(errors).toEqual([])
})

test('a link to a word lands on its highlighted row', async ({ page, errors }) => {
  await loaded(page, '/glossary#undercut')

  await expect(row(page, 'undercut')).toBeInViewport()
  await expect(row(page, 'undercut')).toHaveCSS('background-color', 'rgb(164, 59, 255)')
  await expect(row(page, 'undercut').locator('a')).toHaveAttribute('href', '/chapters/tyres-and-strategy')
  expect(errors).toEqual([])
})

test('a link to a word that does not exist shows the plain list', async ({ page, errors }) => {
  await loaded(page, '/glossary#nope')

  await expect(rows(page)).toHaveCount(53)
  expect(await rows(page).evaluateAll((els) => els.filter((el) => el.matches(':target')).length)).toBe(0)
  expect(errors).toEqual([])
})

test('a letter jumps to its first word', async ({ page, errors }) => {
  await loaded(page)
  await page.locator('.glossary-page .letters a', { hasText: 'U' }).click()

  await expect(row(page, 'undercut')).toBeInViewport()
  await expect(page.locator('.glossary-page .letters span', { hasText: 'X' })).toHaveCount(1)
  expect(errors).toEqual([])
})

test("a chapter's open word leads to that word in the glossary", async ({ page, errors }) => {
  await loaded(page, '/chapters/tyres-and-strategy')
  await page.locator('.words .chips button', { hasText: 'Undercut' }).click()
  await page.locator('.words .head a').click()

  await expect(page).toHaveURL(/\/glossary\/?#undercut$/)
  await expect(row(page, 'undercut')).toBeInViewport()
  expect(errors).toEqual([])
})

test('the page never scrolls sideways', async ({ page, errors }) => {
  await loaded(page)

  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})

test('everything is readable at once under reduced motion', async ({ page, errors }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page)

  await expect(page.locator('.glossary-page h1')).toBeVisible()
  await expect(page.locator('.glossary-page .opening .intro')).toHaveCSS('opacity', '1')
  await expect(rows(page).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('search results show right under the search field', async ({ page, errors }) => {
  await loaded(page)
  await page.getByRole('searchbox', { name: 'Search' }).fill('undercut')

  await expect(row(page, 'undercut')).toBeInViewport()
  expect(errors).toEqual([])
})

test('on a small screen the demo word opens its note at the bottom of the screen', async ({ page, errors }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 1200, 'the note opens beside the word on wide screens')
  await loaded(page)

  const word = page.locator('.glossary-page .tap .term button')

  await word.scrollIntoViewIfNeeded()
  await expect(page.locator('.glossary-page .tap .say')).toHaveCSS('opacity', '1')
  await word.tap()

  const gap = await page.locator('.glossary-page .tap .def').evaluate((el) => innerHeight - el.getBoundingClientRect().bottom)

  expect(gap).toBeGreaterThanOrEqual(0)
  expect(gap).toBeLessThan(40)
  expect(errors).toEqual([])
})
