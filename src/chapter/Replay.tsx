import { useLenis } from 'lenis/react'
import { type CSSProperties, useCallback, useLayoutEffect, useRef, useState } from 'react'

import type { CircuitInfo } from '#/circuits/registry.ts'
import { REDUCED, ScrollTrigger, useGSAP } from '#/motion/motion.ts'
import { MARKS } from '#/pass/interlagos.ts'
import { type Focus, focusAt, nextStep, prevStep, readout, type Step, sliderText, stepAt } from '#/pass/model.ts'
import type { PassFile } from '#/pass/schema.ts'
import { CircuitStage, TELEMETRY_CREDIT } from '#/weekend/CircuitStage.tsx'

import { PassHud } from './PassHud.tsx'

type Vars = CSSProperties & Record<`--${string}`, string>

type Steps = readonly [Step, Step, Step, Step]

const ASPECT = 21 / 9

const CELLS = 5

const SNAP_PX = 2

const TURNS = [{ turn: 12, name: 'Junção' }, { turn: 13 }, { turn: 14 }, { turn: 15 }, { turn: 1, name: 'S do Senna' }, { turn: 2 }]

const SPOTS = [
  { x: 3, y: 7 },
  { x: 14, y: 82 },
  { x: 52, y: 82 },
  { x: 80, y: 68 },
] as const

const CARS = ['chaser', 'leader'] as const

const write = (el: Element | null | undefined, text: string) => {
  if (el && el.textContent !== text) el.textContent = text
}

const spot = (i: number): Vars => ({ '--cx': `${SPOTS[i]?.x ?? 0}%`, '--cy': `${SPOTS[i]?.y ?? 0}%` })

const at = (t: number, end: number): Vars => ({ '--at': `${((t / end) * 100).toFixed(2)}%` })

export function Replay({ pass, all, info }: { pass: PassFile; all: Steps; info: CircuitInfo }) {
  const root = useRef<HTMLElement>(null)
  const end = pass.chaser.rows.at(-1)?.[0] ?? 0
  const time = useRef(REDUCED ? end : 0)
  const focus = useRef<Focus | null>(focusAt(pass, all, time.current))
  const lenis = useLenis()
  const scroller = useRef(lenis)
  const [near, setNear] = useState(false)
  const onNear = useCallback(() => setNear(true), [])
  const km = (((MARKS.apex - MARKS.detection) * pass.lengthM) / 1000).toFixed(1)

  useLayoutEffect(() => {
    scroller.current = lenis
  }, [lenis])

  useGSAP(
    () => {
      const scope = root.current
      const pin = scope?.querySelector<HTMLElement>('.pin')
      const track = scope?.querySelector<HTMLElement>('[role="slider"]')

      if (!scope || !pin || !track) return

      const rows = CARS.map((car) => scope.querySelector(`tr[data-car="${car}"]`))
      const callouts = [...scope.querySelectorAll<HTMLElement>('[data-step]')]
      const marks = [...scope.querySelectorAll<HTMLElement>('[data-mark-step]')]
      const played = scope.querySelector<HTMLElement>('.played')
      const handle = scope.querySelector<HTMLElement>('.handle')
      const clock = scope.querySelector('.now')
      let target: number | null = null
      let st: ScrollTrigger | null = null

      const show = (t: number) => {
        const now = readout(pass, t)
        const n = stepAt(all, t)

        time.current = t
        focus.current = focusAt(pass, all, t)
        track.setAttribute('aria-valuenow', t.toFixed(1))
        track.setAttribute('aria-valuetext', sliderText(all, t))
        write(clock, `${t.toFixed(1)} s`)

        if (played) played.style.scale = `${t / end} 1`

        if (handle) handle.style.left = `${(t / end) * 100}%`

        for (const el of callouts) {
          const s = Number(el.dataset.step)

          el.toggleAttribute('data-lit', s <= n)
          el.toggleAttribute('data-current', s === n)
        }

        for (const el of marks) {
          const s = Number(el.dataset.markStep)

          el.toggleAttribute('data-lit', s <= n)
          el.toggleAttribute('data-current', s === n)
        }

        for (const [i, car] of CARS.entries()) {
          const row = rows[i]
          const r = now[car]

          write(row?.querySelector('[data-speed]'), `${r.speed} km/h`)
          write(row?.querySelector('[data-gap]'), r.gap)
          write(row?.querySelector('[data-gear]'), String(r.gear))
          write(row?.querySelector('[data-mode]'), r.mode)
          row?.querySelector('[data-mode]')?.toggleAttribute('data-on', r.mode === 'Overtake')
          row?.querySelector('.meter')?.toggleAttribute('data-brake', r.brake)

          for (const [j, cell] of [...(row?.querySelectorAll('.meter i') ?? [])].entries()) cell.toggleAttribute('data-on', j < r.cells)
        }
      }

      const fromScroll = (progress: number) => {
        const t = progress * end
        const span = st ? st.end - st.start : 0
        const snap = span > 0 ? (SNAP_PX * end) / span : 0

        if (target !== null && Math.abs(t - target) <= snap) return show(target)

        target = null
        show(t)
      }

      const seek = (t: number) => {
        const to = Math.min(end, Math.max(0, t))

        show(to)

        if (!st) return

        target = to

        const y = st.start + (to / end) * (st.end - st.start)
        const smooth = scroller.current

        if (smooth) smooth.scrollTo(y, { immediate: true, force: true })
        else window.scrollTo(0, y)
      }

      if (!REDUCED) {
        st = ScrollTrigger.create({
          trigger: pin,
          start: 'top top',
          end: '+=250%',
          pin: true,
          onUpdate: (self) => fromScroll(self.progress),
          onRefresh: (self) => fromScroll(self.progress),
        })
        fromScroll(st.progress)
      } else show(end)

      const fromX = (x: number) => {
        const r = track.getBoundingClientRect()

        return ((x - r.left) / r.width) * end
      }

      const onDown = (e: PointerEvent) => {
        track.setPointerCapture(e.pointerId)
        track.focus({ preventScroll: true })
        seek(fromX(e.clientX))
      }

      const onMove = (e: PointerEvent) => {
        if (track.hasPointerCapture(e.pointerId)) seek(fromX(e.clientX))
      }

      const back = () => prevStep(all, time.current)
      const on = () => nextStep(all, time.current, end)

      const keys = new Map([
        ['ArrowLeft', back],
        ['ArrowDown', back],
        ['ArrowRight', on],
        ['ArrowUp', on],
        ['Home', () => 0],
        ['End', () => end],
      ])

      const onKey = (e: KeyboardEvent) => {
        const to = keys.get(e.key)

        if (!to) return

        e.preventDefault()
        seek(to())
      }

      track.addEventListener('pointerdown', onDown)
      track.addEventListener('pointermove', onMove)
      track.addEventListener('keydown', onKey)

      return () => {
        track.removeEventListener('pointerdown', onDown)
        track.removeEventListener('pointermove', onMove)
        track.removeEventListener('keydown', onKey)
      }
    },
    { scope: root, dependencies: [pass, all, end] },
  )

  return (
    <section className="replay band circuit" data-theme="dark" aria-labelledby="replay" ref={root}>
      <div className="head">
        <p className="mono muted label">The replay · Interlagos, Turn 12 to Turn 1</p>
        <p className="mono who">{`${pass.race} ${pass.year} · Lap ${pass.lap} · ${pass.chaser.code} on ${pass.leader.code} for P${pass.position}`}</p>
        <h2 id="replay" className="display headline">
          <span className="hl">{`About ${km} km`}</span>
          <span className="hl">to make it stick.</span>
        </h2>
        <p className="body">
          The same idea at Interlagos under the 2026 rules: a real pass from the São Paulo Grand Prix, on the real track and slowed down. Two cars, one straight, four steps. Scroll, or drag the timeline, to replay it.
        </p>
      </div>
      <div className="pin">
        <div className="screen">
          <CircuitStage
            info={info}
            near={near}
            lap={null}
            onNear={onNear}
            turns={TURNS}
            focus={focus}
            aspect={ASPECT}
            hud={({ stage, replay, ready }) => <PassHud pass={pass} stage={stage} replay={replay} time={time} ready={ready} />}
          />
          <p className="mono note">{`Flat out from Junção to Turn 1 · about ${km} km`}</p>
          <ol className="steps">
            {all.map((s, i) => (
              <li key={s.n} data-step={s.n} style={spot(i)}>
                <b className="mono">{s.n}</b>
                <p className="title">{s.title}</p>
                <p className="text">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
        <table className="board">
          <thead className="mono">
            <tr>
              <th scope="col">Car</th>
              <th scope="col">Speed</th>
              <th scope="col">Gap</th>
              <th scope="col">Gear</th>
              <th scope="col">Mode</th>
              <th scope="col">Throttle</th>
            </tr>
          </thead>
          <tbody>
            {CARS.map((car) => (
              <tr key={car} data-car={car}>
                <th scope="row" className="mono">
                  {`${car === 'chaser' ? 'Chaser' : 'Leader'} · ${pass[car].code}`}
                </th>
                <td data-label="Speed" data-speed />
                <td data-label="Gap" data-gap />
                <td data-label="Gear" data-gear />
                <td data-label="Mode" data-mode />
                <td data-label="Throttle">
                  <span className="meter">
                    {Array.from({ length: CELLS }, (_, i) => (
                      <i key={i} />
                    ))}
                    <span className="mono brake">Brake</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="timeline">
          <p className="mono scale">
            <span>0.0 s</span>
            <span className="now">0.0 s</span>
            <span>{`${end.toFixed(1)} s`}</span>
          </p>
          <div className="track" role="slider" tabIndex={0} aria-label="Replay time" aria-valuemin={0} aria-valuemax={Number(end.toFixed(1))} aria-valuenow={0} aria-valuetext={sliderText(all, 0)}>
            <i className="played" />
            <i className="handle" />
          </div>
          <ol className="mono marks">
            {all.map((s) => (
              <li key={s.n} data-mark-step={s.n} style={at(s.t, end)}>
                <b>{s.n}</b>
                <span>{s.title}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mono meta">
          <p className="hint">Drag the timeline, or use ← → to step through it.</p>
          <p className="foot">Overtake Mode is shown where the rules unlock it. Teams don't publish when a driver presses it.</p>
        </div>
      </div>
      <p className="mono credit">{TELEMETRY_CREDIT}</p>
    </section>
  )
}
