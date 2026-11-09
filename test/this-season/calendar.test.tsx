import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it, setSystemTime } from 'bun:test'
import { Effect } from 'effect'

import type { SeasonSnapshot } from '../../src/season/snapshot-schema.ts'
import { calendar2026 } from '../season/fake-jolpica.ts'
import { snapshotAt } from '../season/snapshot.ts'

const { cleanup, fireEvent, render } = await import('@testing-library/react')
const { Calendar } = await import('../../src/this-season/Calendar.tsx')
const { ShellContext } = await import('../../src/shell/context.ts')

const NOW = '2026-11-06T15:00:00Z'

afterEach(() => cleanup())

afterAll(async () => {
  setSystemTime()
  await GlobalRegistrator.unregister()
})

const went: Array<string> = []

afterEach(() => {
  went.length = 0
})

const renderWith = (snapshot: SeasonSnapshot) => {
  setSystemTime(new Date(NOW))

  const go = async (to: string) => {
    went.push(to)
  }

  return render(
    <ShellContext.Provider value={{ go }}>
      <Calendar snapshot={snapshot} />
    </ShellContext.Provider>,
  )
}

const tile = (root: HTMLElement, round: number) => {
  const button = root.querySelectorAll<HTMLButtonElement>('.tile button')[round - 1]

  if (!button) throw new Error(`no tile ${round}`)

  return button
}

const card = (root: HTMLElement) => root.querySelector('.card')?.textContent ?? null

it('renders every round with the live one marked', async () => {
  const { container } = renderWith(await snapshotAt(NOW))

  expect(container.querySelectorAll('.tile')).toHaveLength(23)
  expect(tile(container, 20).getAttribute('aria-current')).toBe('true')
  expect(tile(container, 20).querySelector('img')?.getAttribute('src')).toBe('/circuits/tiles/br-1940-now-light.webp')
  expect(tile(container, 19).getAttribute('aria-current')).toBeNull()
})

it('opens the circuit card on hover', async () => {
  const { container } = renderWith(await snapshotAt(NOW))
  const monza = tile(container, 13)

  fireEvent.pointerEnter(monza, { pointerType: 'mouse' })

  expect(card(container)).toContain('R13 · Italian Grand Prix')
  expect(card(container)).toContain('Monza · 5.793 km · 53 laps')
  expect(card(container)).toContain('From orbit · Monza, 2018 · Photo Planet Labs · CC BY-SA 4.0')
  expect(monza.querySelector('img')?.getAttribute('src')).toBe('/circuits/tiles/it-1922-hover-light.webp')
  expect(monza.getAttribute('aria-describedby')).toBe(container.querySelector('.card')?.id ?? 'missing')

  fireEvent.pointerLeave(monza, { pointerType: 'mouse' })

  expect(card(container)).toBeNull()
})

it('opens the card on keyboard focus and closes it on Escape', async () => {
  const { container } = renderWith(await snapshotAt(NOW))
  const monza = tile(container, 13)

  fireEvent.focus(monza)

  expect(card(container)).toContain('R13 · Italian Grand Prix')

  fireEvent.keyDown(monza, { key: 'Escape' })

  expect(card(container)).toBeNull()
})

it('locks the card open on a tap and closes it on a second tap', async () => {
  const { container } = renderWith(await snapshotAt(NOW))
  const monza = tile(container, 13)

  fireEvent.pointerDown(monza, { pointerType: 'touch' })
  fireEvent.click(monza)

  expect(card(container)).toContain('R13 · Italian Grand Prix')

  fireEvent.pointerDown(monza, { pointerType: 'touch' })
  fireEvent.click(monza)

  expect(card(container)).toBeNull()
})

it('shows a circuit it has no tile for by its code alone', async () => {
  const races = calendar2026.races.map((race) => (race.round === 13 ? { ...race, circuit: { ...race.circuit, circuitId: 'nowhere' } } : race))
  const { container } = renderWith(await snapshotAt(NOW, { races: () => Effect.succeed({ ...calendar2026, races }) }))
  const unknown = tile(container, 13)

  expect(unknown.querySelector('img')).toBeNull()
  expect(unknown.textContent).toContain('ITA')

  fireEvent.pointerEnter(unknown, { pointerType: 'mouse' })

  expect(card(container)).toBeNull()
})

it('a click on the current round opens the Race weekend page', async () => {
  const { container } = renderWith(await snapshotAt(NOW))

  fireEvent.pointerDown(tile(container, 20), { pointerType: 'mouse' })
  fireEvent.click(tile(container, 20))

  expect(went).toEqual(['/weekend'])
  expect(tile(container, 20).dataset.to).toBe('/weekend')
})

it('a click on any other round goes nowhere', async () => {
  const { container } = renderWith(await snapshotAt(NOW))

  fireEvent.pointerDown(tile(container, 13), { pointerType: 'mouse' })
  fireEvent.click(tile(container, 13))

  expect(went).toEqual([])
  expect(tile(container, 13).dataset.to).toBeUndefined()
})

it('a tap on the current round opens its card with a link to the Race weekend page', async () => {
  const { container } = renderWith(await snapshotAt(NOW))

  fireEvent.pointerDown(tile(container, 20), { pointerType: 'touch' })
  fireEvent.click(tile(container, 20))

  expect(went).toEqual([])
  expect(container.querySelector('.card a')?.getAttribute('href')).toBe('/weekend')
})
