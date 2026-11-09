import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it, setSystemTime } from 'bun:test'

import { snapshotAt } from '../season/snapshot.ts'

const { act, cleanup, render } = await import('@testing-library/react')
const { gsap } = await import('gsap')
const { ThisWeekend } = await import('../../src/this-season/ThisWeekend.tsx')
const { ShellContext } = await import('../../src/shell/context.ts')

const go = async () => {}

const NOW = '2026-11-07T12:00:00Z'

afterEach(() => cleanup())

afterAll(async () => {
  setSystemTime()
  await GlobalRegistrator.unregister()
})

it('fills the next session and counts it down', async () => {
  setSystemTime(new Date(NOW))

  const { container } = render(
    <ShellContext.Provider value={{ go }}>
      <ThisWeekend snapshot={await snapshotAt(NOW)} />
    </ShellContext.Provider>,
  )

  const next = () => container.querySelector('.sessions .is-next .status')?.textContent

  expect(container.querySelectorAll('.sessions .is-next')).toHaveLength(1)
  expect(next()).toBe('Next · 02h 30m')
  expect(container.querySelector('.facts')?.textContent).toContain('4.309 km')
  expect(container.querySelector('.caption a')?.getAttribute('href')).toBe('/weekend')
  expect(container.querySelector('.this-weekend .credit')?.textContent).toBe('From the air · São Paulo, 2022 · Photo Governo do Estado de São Paulo · CC BY 2.0 · times from the official calendar')

  setSystemTime(new Date(Date.parse(NOW) + 60_000))

  act(() => gsap.ticker.tick())

  expect(next()).toBe('Next · 02h 29m')
})
