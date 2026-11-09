import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it, setSystemTime } from 'bun:test'

import { snapshotAt } from '../season/snapshot.ts'

const { cleanup, render } = await import('@testing-library/react')
const { WhoLed } = await import('../../src/this-season/WhoLed.tsx')

const NOW = '2026-11-06T15:00:00Z'

afterEach(() => cleanup())

afterAll(async () => {
  setSystemTime()
  await GlobalRegistrator.unregister()
})

const snapshot = await snapshotAt(NOW)

it('strips the leaders into stints with the live round after them', () => {
  setSystemTime(new Date(NOW))

  const { container } = render(<WhoLed snapshot={snapshot} />)
  const stints = [...container.querySelectorAll('.stint')]

  expect(stints.map((stint) => stint.querySelector('.when')?.textContent)).toEqual(['R1 to R2', 'Leader · from R3'])
  expect(stints[1]?.querySelector('.count')?.textContent).toBe('17 rounds so far')
  expect(container.querySelector('.live-round')?.textContent).toContain('São Paulo GP · live this weekend')
  expect(container.querySelectorAll('.to-race')).toHaveLength(3)
  expect(container.querySelector('.who-led')?.getAttribute('data-theme')).toBe('dark')
})

it('renders nothing without history', () => {
  const { history: _history, ...rest } = snapshot
  const { container } = render(<WhoLed snapshot={rest} />)

  expect(container.innerHTML).toBe('')
})
