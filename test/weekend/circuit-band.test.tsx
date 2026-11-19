import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it, mock, spyOn } from 'bun:test'
import { Schema } from 'effect'

import { SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'
import type { Place } from '../../src/weekend/CircuitStage.tsx'
import { ShellContext } from '../../src/shell/context.ts'
import { weekendPage } from '../../src/weekend/page-model.ts'

mock.module('../../src/circuits/Circuit.tsx', () => ({
  default: () => {
    throw new Error('the model failed to load')
  },
}))

const { act, cleanup, fireEvent, render, waitFor } = await import('@testing-library/react')
const { CircuitBand } = await import('../../src/weekend/CircuitBand.tsx')
const { CircuitStage } = await import('../../src/weekend/CircuitStage.tsx')
const { circuitFor } = await import('../../src/circuits/registry.ts')

const snapshot = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot.json').text())

const page = weekendPage(snapshot, new Date('2026-11-07T12:30:00Z'), 'Asia/Jakarta')

if (!page) throw new Error('the fixture has a weekend')

const { band } = page

const shell = { go: async () => {}, surface: async () => {} }

const view = (b: typeof band) =>
  render(<CircuitBand band={b} />, { wrapper: ({ children }) => <ShellContext.Provider value={shell}>{children}</ShellContext.Provider> })

const observers = globalThis.IntersectionObserver

const INTERLAGOS = await Bun.file('test/fixtures/pole/interlagos.json').text()

const CREDIT = 'Blender model · layout bacinger/f1-circuits (MIT) · elevation SRTM (NASA) · Map © OpenStreetMap contributors (ODbL)'

class Near {
  constructor(private readonly callback: (entries: ReadonlyArray<{ isIntersecting: boolean }>) => void) {}

  observe() {
    this.callback([{ isIntersecting: true }])
  }

  disconnect() {}
}

const nearby = () => Object.defineProperty(globalThis, 'IntersectionObserver', { value: Near, configurable: true, writable: true })

const withPole = async (response: Response) => {
  nearby()

  const fetched = spyOn(globalThis, 'fetch').mockResolvedValue(response)
  const quiet = spyOn(console, 'error').mockImplementation(() => {})
  const rendered = view(band)

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  return { ...rendered, fetched, restore: () => [fetched, quiet].forEach((spy) => spy.mockRestore()) }
}

afterEach(() => {
  cleanup()
  globalThis.IntersectionObserver = observers
})

afterAll(async () => {
  await GlobalRegistrator.unregister()
})

it('shows the circuit stats and the schedule with the next session marked', () => {
  const { container } = view(band)
  const stats = container.querySelector('.figures')?.textContent ?? ''

  expect(stats).toContain('6–8 Nov')
  expect(stats).toContain('4.309')
  expect(stats).toContain('305.879')
  expect(stats).toContain('1973')
  expect(container.querySelector('.schedule .mono')?.textContent).toBe('Schedule · your time · GMT+7')
  expect(container.querySelectorAll('.schedule li')).toHaveLength(5)
  expect(container.querySelector('.schedule .is-next')?.textContent).toContain('Practice 3')
  expect(container.querySelector('.credit')?.textContent).toBe(CREDIT)
})

it('the Turns toggle hides the turn numbers', () => {
  const { container, getByRole } = view(band)

  fireEvent.click(getByRole('button', { name: 'Turns' }))

  expect(container.querySelector('.stage')?.getAttribute('data-turns')).toBe('off')
  expect(getByRole('button', { name: 'Turns' }).getAttribute('aria-pressed')).toBe('false')
})

it('without a 3D model it shows only the stats and the schedule', () => {
  const { container } = view({ ...band, info: undefined })

  expect(container.querySelector('.figures')).not.toBeNull()
  expect(container.querySelectorAll('.schedule li')).toHaveLength(5)
  expect(container.querySelector('.stage')).toBeNull()
  expect(container.querySelector('.toggles')).toBeNull()
})

it('keeps the poster and turns Sectors off when the model fails to load', async () => {
  nearby()

  const quiet = spyOn(console, 'error').mockImplementation(() => {})
  const { container, getByRole } = view(band)

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  expect(container.querySelector('.stage')?.hasAttribute('data-failed')).toBe(true)
  expect(container.querySelector<HTMLImageElement>('.poster')?.hidden).toBe(false)
  expect(getByRole('button', { name: 'Sectors' }).hasAttribute('disabled')).toBe(true)

  quiet.mockRestore()
})

it('links Explore the lap in 3D to its circuit', () => {
  const { getByText } = view(band)
  const link = getByText('Explore the lap in 3D').closest('a')

  expect(link?.getAttribute('href')).toBe('/lap/interlagos')
  expect(link?.classList.contains('is-soon')).toBe(false)
})

it('labels a wet pole lap', async () => {
  const { container, fetched, restore } = await withPole(new Response(INTERLAGOS))

  await waitFor(() => expect(container.querySelector('.replay .who')?.textContent).toBe('Pole lap · Lando Norris · 2026 São Paulo Grand Prix · Wet'))
  expect(fetched.mock.calls[0]?.[0]).toBe('/api/pole/interlagos')
  restore()
})

it('credits OpenF1 only when a lap is shown', async () => {
  const shown = await withPole(new Response(INTERLAGOS))

  await waitFor(() => expect(shown.container.querySelector('.credit')?.textContent).toBe(`${CREDIT} · Telemetry: OpenF1 (unofficial)`))
  shown.restore()
  cleanup()

  const none = await withPole(new Response(null, { status: 204 }))

  expect(none.container.querySelector('.replay')).toBeNull()
  expect(none.container.querySelector('.credit')?.textContent).toBe(CREDIT)
  none.restore()
})

it('rides each place tag on its turn pin so it moves with the model', () => {
  const info = circuitFor('vegas')

  if (!info) throw new Error('Las Vegas is modelled')

  const { container } = render(<CircuitStage info={info} near={false} lap={null} onNear={() => {}} places={[{ label: 'The Sphere', turn: 8, up: true }, { label: 'The Strip', turn: 13 }]} />, {
    wrapper: ({ children }) => <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>,
  })

  const tags = [...container.querySelectorAll('.pins .place')]

  expect(tags.map((tag) => [tag.closest('[data-pin]')?.getAttribute('data-pin'), tag.textContent, tag.hasAttribute('data-up')])).toEqual([
    ['turn-8', 'The Sphere', true],
    ['turn-13', 'The Strip', false],
  ])
})

const vegas = circuitFor('vegas')

if (!vegas) throw new Error('Las Vegas is modelled')

const stage = (props: { places?: ReadonlyArray<{ label: string; turn: number; up?: true }>; onNear?: () => void }) =>
  render(<CircuitStage info={vegas} near={false} lap={null} {...props} />, {
    wrapper: ({ children }) => <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>,
  })

it('lets the place tags name the places, so the corner name stays off a track page', () => {
  const corners = (container: HTMLElement) => [...container.querySelectorAll('.pins .turn i')].map((name) => name.textContent)

  expect(corners(stage({ onNear: () => {} }).container)).toEqual(['Sphere chicane'])
  cleanup()
  expect(corners(stage({ places: [{ label: 'The Sphere', turn: 8, up: true }] }).container)).toEqual([])
})

it('watches nothing when no one asks to hear that the stage is near', () => {
  let built = 0

  class Counted {
    constructor() {
      built++
    }

    observe() {}

    disconnect() {}
  }

  Object.defineProperty(globalThis, 'IntersectionObserver', { value: Counted, configurable: true, writable: true })

  const { rerender } = stage({})

  rerender(<CircuitStage info={vegas} near={false} lap={null} />)

  expect(built).toBe(0)
})

const monza = circuitFor('monza')

if (!monza) throw new Error('Monza is modelled')

const monzaStage = (props: { places?: ReadonlyArray<Place>; bare?: true }) =>
  render(<CircuitStage info={monza} near={false} lap={null} {...props} />, {
    wrapper: ({ children }) => <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>,
  })

it('rides each mark tag on its mark pin, the purple one marked accent', () => {
  const { container } = monzaStage({
    places: [
      { label: 'Pole', mark: 'pole' },
      { label: 'Grid 19 · his start', mark: 'grid-19', accent: true },
    ],
  })
  const tags = [...container.querySelectorAll('.pins .mark .place')]
  const at = [...container.querySelectorAll<HTMLElement>('.pins .mark')].map((el) => [el.dataset.pin, Number(el.style.getPropertyValue('--px')), Number(el.style.getPropertyValue('--py'))])

  expect(tags.map((tag) => [tag.closest('[data-pin]')?.getAttribute('data-pin'), tag.textContent, tag.hasAttribute('data-accent')])).toEqual([
    ['mark-pole', 'Pole', false],
    ['mark-grid-19', 'Grid 19 · his start', true],
  ])
  expect(at.sort()).toEqual((monza.marks ?? []).map((m) => [`mark-${m.name}`, m.x, m.y]).sort())
  expect(container.querySelectorAll('.pins .turn')).toHaveLength(11)
})

it('draws no mark that no place names', () => {
  expect(monzaStage({}).container.querySelectorAll('.pins .mark')).toHaveLength(0)
})

it('a bare stage shows the poster without sector labels', () => {
  const bare = monzaStage({ bare: true }).container.querySelector('img.poster')

  expect(bare?.getAttribute('src')).toBe('/circuits/it-1922-bare.webp')
  expect(bare?.getAttribute('srcset')).toContain('/circuits/it-1922-bare-1440.webp 1440w')
  cleanup()
  expect(monzaStage({}).container.querySelector('img.poster')?.getAttribute('src')).toBe('/circuits/it-1922.webp')
})
