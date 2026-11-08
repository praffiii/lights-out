import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it } from 'bun:test'

const { cleanup, fireEvent, render } = await import('@testing-library/react')
const { Tracker } = await import('../../src/home/Tracker.tsx')

afterEach(() => cleanup())

afterAll(async () => {
  cleanup()
  await GlobalRegistrator.unregister()
})

it('offers a labelled button for each of the 22 cars', () => {
  const { getAllByRole } = render(<Tracker at={0} onPick={() => {}} lap={{ current: null }} paused={false} onPause={() => {}} />)
  const ticks = getAllByRole('button', { name: /^Show / })
  expect(ticks).toHaveLength(22)
  expect(ticks[0]?.getAttribute('aria-label')).toBe('Show Oscar Piastri, McLaren MCL40')
})

it('names the car on track and its photo credit', () => {
  const { getByText } = render(<Tracker at={2} onPick={() => {}} lap={{ current: null }} paused={false} onPause={() => {}} />)
  expect(getByText('On track · 03 / 22')).toBeTruthy()
  expect(getByText('George Russell')).toBeTruthy()
  expect(getByText('Liauzh · CC BY 4.0')).toBeTruthy()
})

it('reports a pick and a pause', () => {
  const picked: number[] = []
  let paused = 0
  const { getByRole } = render(<Tracker at={0} onPick={(i) => picked.push(i)} lap={{ current: null }} paused={false} onPause={() => paused++} />)
  fireEvent.click(getByRole('button', { name: 'Show Max Verstappen, Red Bull RB22' }))
  fireEvent.click(getByRole('button', { name: 'Pause' }))
  expect(picked).toEqual([4])
  expect(paused).toBe(1)
})
