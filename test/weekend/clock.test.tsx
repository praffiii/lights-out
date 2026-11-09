import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { afterAll, afterEach, expect, it, jest, setSystemTime, spyOn } from 'bun:test'
import { Schema } from 'effect'

import { SeasonSnapshotJson } from '../../src/season/snapshot-schema.ts'
import { weekendPage } from '../../src/weekend/page-model.ts'

const { act, cleanup, fireEvent, render } = await import('@testing-library/react')
const { gsap } = await import('gsap')
const { Clock } = await import('../../src/weekend/Clock.tsx')

const snapshot = Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot.json').text())

afterEach(() => cleanup())

afterAll(async () => {
  setSystemTime()
  await GlobalRegistrator.unregister()
})

const show = (iso: string) => {
  setSystemTime(new Date(iso))

  const page = weekendPage(snapshot, new Date(iso), 'Asia/Jakarta')

  if (!page) throw new Error('the fixture has a weekend')

  return render(<Clock page={page} snapshot={snapshot} />)
}

it('counts down to Practice 3 a second at a time', () => {
  const { container } = show('2026-11-07T12:30:00Z')
  const digits = () => [...container.querySelectorAll('.digits .value')].map((el) => el.textContent)

  expect(digits()).toEqual(['02', '00', '00'])
  expect(container.querySelector('.clock-head')?.textContent).toContain('Next · Practice 3')
  expect(container.querySelector('.note')?.textContent).toBe("Then qualifying at 15:00 track time: three knockout rounds that set Sunday's grid.")

  setSystemTime(new Date('2026-11-07T12:30:01Z'))
  act(() => gsap.ticker.tick())

  expect(digits()).toEqual(['01', '59', '59'])
})

it('shows the flag line and no digits after the race', () => {
  const { container } = show('2026-11-08T20:00:00Z')

  expect(container.querySelector('.digits')).toBeNull()
  expect(container.querySelector('.flag')?.textContent).toBe('Chequered flag. The Las Vegas Grand Prix starts Sat 21 Nov.')
})

it('hands the weekend to the calendar as a .ics file and frees it once the download has started', () => {
  const created = spyOn(URL, 'createObjectURL').mockReturnValue('blob:weekend')
  const revoked = spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
  jest.useFakeTimers()

  const { getByRole } = show('2026-11-07T12:30:00Z')

  fireEvent.click(getByRole('button', { name: /Add the weekend to your calendar/ }))

  const blob = created.mock.calls[0]?.[0]

  expect(blob instanceof Blob && blob.type).toStartWith('text/calendar')
  expect(revoked).not.toHaveBeenCalled()

  jest.advanceTimersByTime(40_000)
  jest.useRealTimers()

  expect(revoked).toHaveBeenCalledWith('blob:weekend')

  created.mockRestore()
  revoked.mockRestore()
})
