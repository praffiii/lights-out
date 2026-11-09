import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it } from 'bun:test'

import { portraitFor } from '../../src/drivers/portraits.ts'
import { snapshotAt } from '../season/snapshot.ts'

const { cleanup, render } = await import('@testing-library/react')
const { Latest } = await import('../../src/weekend/Latest.tsx')
const { weekendPage } = await import('../../src/weekend/page-model.ts')

afterEach(() => cleanup())

afterAll(async () => {
  await GlobalRegistrator.unregister()
})

const NOW = '2026-11-06T21:00:00Z'

const latest = weekendPage(await snapshotAt(NOW), new Date(NOW), 'UTC')?.latest ?? null

if (!latest) throw new Error('the fixture has an FP2 result')

it('shows the gap, the headline, the top three and the portrait credit', () => {
  const { container } = render(<Latest latest={latest} />)

  expect(container.querySelector('.gap')?.textContent).toBe('0.253 s')
  expect(container.querySelector('h2')?.textContent).toBe('Antonelli fastest. Norris that far behind.')
  expect(container.querySelector('.body')?.textContent).toBe("Verstappen third, Russell fourth. Practice times hint, they don't decide: teams run different fuel loads and tyres.")
  expect([...container.querySelectorAll('.order li')].map((li) => li.textContent)).toEqual(['P1ANT1:10.763', 'P2NOR+0.253', 'P3VER+0.259'])
  expect(container.querySelector('figcaption')?.textContent).toBe(`Kimi Antonelli · Mercedes${portraitFor('ANT')?.credit}`)
})

it('gives the text the full width without an image', () => {
  const { container } = render(<Latest latest={{ ...latest, image: undefined }} />)

  expect(container.querySelector('figure')).toBeNull()
  expect(container.querySelector('.latest')?.classList.contains('is-text')).toBe(true)
})

it('renders nothing without a latest result', () => {
  const { container } = render(<Latest latest={null} />)

  expect(container.innerHTML).toBe('')
})
