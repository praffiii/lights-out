import { readFileSync } from 'node:fs'

import { test as base, type Page } from '@playwright/test'

const snapshot = readFileSync('test/fixtures/season-snapshot.json', 'utf8')

export const SNAPSHOT_AT = new Date('2026-11-06T15:00:00Z')

export const stubSeason = (page: Page, response: { status: number; body: string } = { status: 200, body: snapshot }) =>
  page.route('**/api/season', (route) => route.fulfill({ status: response.status, contentType: 'application/json', body: response.body }))

export const watchErrors = (page: Page) => {
  const errors: string[] = []

  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })

  return errors
}

export const LOADER_MS = 10_000

export const hiddenText = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('main *, footer *')].flatMap((el) => {
      const text = (el.textContent ?? '').trim()
      const style = getComputedStyle(el)
      const hidden = el.children.length === 0 && text !== '' && (style.visibility === 'hidden' || style.opacity === '0') && el.getBoundingClientRect().width > 0

      return hidden ? [`${el.tagName.toLowerCase()}.${el.className}: ${text.slice(0, 40)}`] : []
    }),
  )

export const visibleBars = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll('.bar')].filter((el) => el.getBoundingClientRect().width > 0.5).length)

export const scrollToEnd = async (page: Page) => {
  for (let i = 0; i < 200; i++) {
    const done = await page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 2)

    if (done) break

    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(120)
  }

  await page.waitForTimeout(1500)
}

export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    await page.clock.install({ time: SNAPSHOT_AT })
    await stubSeason(page)
    await use(watchErrors(page))
  },
})

export { expect } from '@playwright/test'
