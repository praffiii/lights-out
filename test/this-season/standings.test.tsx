import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it } from 'bun:test'

import { snapshotAt } from '../season/snapshot.ts'

const { cleanup, fireEvent, render } = await import('@testing-library/react')
const { Drivers } = await import('../../src/this-season/Drivers.tsx')
const { Constructors } = await import('../../src/this-season/Constructors.tsx')

afterEach(() => cleanup())

afterAll(async () => {
  await GlobalRegistrator.unregister()
})

const snapshot = await snapshotAt('2026-11-06T15:00:00Z')

it('lists P4 to P10 and reveals the rest of the field in place', () => {
  const { container, getByRole } = render(<Drivers snapshot={snapshot} />)

  expect(container.querySelectorAll('.podium figure')).toHaveLength(3)
  expect([...container.querySelectorAll('.tower tbody tr')].map((row) => row.querySelector('td')?.textContent)).toEqual(['04', '05', '06', '07', '08', '09', '10'])

  fireEvent.click(getByRole('button', { name: '15 more drivers · Show all' }))

  expect(container.querySelectorAll('.tower tbody tr')).toHaveLength(22)
  expect(container.querySelector('.tower')?.textContent).toContain('Racing Bulls')
})

it('adds each team up from its drivers', () => {
  const { container, getByRole } = render(<Constructors snapshot={snapshot} />)
  const redBull = [...container.querySelectorAll('.team-row')].find((row) => row.querySelector('.team')?.textContent === 'Red Bull')

  expect([...(redBull?.querySelectorAll('.part b') ?? [])].map((b) => b.textContent)).toEqual(['261', '107', '14'])
  expect([...(redBull?.querySelectorAll('.part .who') ?? [])].map((who) => who.textContent)).toEqual(['VER', 'HAD', 'Others'])
  expect(redBull?.querySelector('.total b')?.textContent).toBe('382')
  expect(container.querySelectorAll('.team-row')).toHaveLength(5)

  fireEvent.click(getByRole('button', { name: '6 more teams · Show all' }))

  expect(container.querySelectorAll('.team-row')).toHaveLength(11)
})
