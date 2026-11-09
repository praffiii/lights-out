import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it } from 'bun:test'

import { snapshotAt } from '../season/snapshot.ts'

const { cleanup, render } = await import('@testing-library/react')
const { TitleFight } = await import('../../src/this-season/TitleFight.tsx')

afterEach(() => cleanup())

afterAll(async () => {
  await GlobalRegistrator.unregister()
})

it('poses the gap between the front two with their names and the decided line', async () => {
  const { container } = render(<TitleFight snapshot={await snapshotAt('2026-11-06T15:00:00Z')} />)
  const text = container.textContent ?? ''

  expect(container.querySelector('.gap')?.textContent).toBe('119')
  expect(text).toContain('Kimi Antonelli')
  expect(text).toContain('Max Verstappen')
  expect(text).toContain('Antonelli is the 2026 champion. It was settled at the Mexico City Grand Prix, with four rounds to spare.')
  expect(container.querySelectorAll('.fighter img.portrait')).toHaveLength(2)
})
