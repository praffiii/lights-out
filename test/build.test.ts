import { expect, it } from 'bun:test'

it('prerenders the home page with the disclaimer', async () => {
  const page = Bun.file('dist/client/index.html')
  expect(await page.exists()).toBe(true)
  expect(await page.text()).toContain('unofficial fan project')
})
