import { useLenis } from 'lenis/react'
import { type CSSProperties, useCallback, useLayoutEffect, useRef, useState } from 'react'

import type { CircuitInfo } from '#/circuits/registry.ts'
import { TEAMS } from '#/home/cars.ts'
import { gsap, REDUCED, ScrollTrigger, useGSAP } from '#/motion/motion.ts'
import { MARKS } from '#/pass/interlagos.ts'
import { type Focus, nextStep, prevStep, readout, type Step, sliderText, stepAt } from '#/pass/model.ts'
import type { PassFile } from '#/pass/schema.ts'
import { CircuitStage, TELEMETRY_CREDIT } from '#/weekend/CircuitStage.tsx'

import { PassHud } from './PassHud.tsx'

type Vars = CSSProperties & Record<`--${string}`, string>

type Steps = readonly [Step, Step, Step, Step]

const CELLS = 5

const K_CHASE = 4.2

const FLY = 2.4

const FOLLOW = 0.1

const SETTLE = 0.002

const LIVE = 0.4

const SNAP_PX = 2

const TURNS = [{ turn: 12, name: 'Junção' }, { turn: 1, name: 'S do Senna' }]

const CARS = ['chaser', 'leader'] as const

const COLOURS = new Map(Object.entries(TEAMS).map(([team, t]) => [team, t.colour]))

const colours = (pass: PassFile): Vars => ({ '--chaser': COLOURS.get(pass.chaser.team) ?? '#fff', '--leader': COLOURS.get(pass.leader.team) ?? '#fff' })

const write = (el: Element | null | undefined, text: string) => {
  if (el && el.textContent !== text) el.textContent = text
}

const at = (t: number, end: number): Vars => ({ '--at': `${((t / end) * 100).toFixed(2)}%` })

const smooth = (x: number) => {
  const f = Math.min(1, Math.max(0, x))

  return f * f * (3 - 2 * f)
}

const camAt = (pass: PassFile, t: number): Focus => {
  const now = readout(pass, t)
  const w = smooth(t / FLY)

  return { u: (now.u.chaser + now.u.leader) / 2, k: 1 + (K_CHASE - 1) * w, w }
}

export function Replay({ pass, all, info }: { pass: PassFile; all: Steps; info: CircuitInfo }) {
  const root = useRef<HTMLElement>(null)
  const end = pass.chaser.rows.at(-1)?.[0] ?? 0
  const time = useRef(REDUCED ? end : 0)
  const focus = useRef<Focus | null>(camAt(pass, time.current))
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
      let goal = time.current
      let target: number | null = null
      let st: ScrollTrigger | null = null

      const show = (t: number) => {
        const now = readout(pass, t)
        const n = stepAt(all, t)

        time.current = t
        focus.current = camAt(pass, t)
        scope.toggleAttribute('data-live', t > LIVE)
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

          write(row?.querySelector('[data-speed]'), String(r.speed))
          write(row?.querySelector('[data-gap]'), r.gap)
          write(row?.querySelector('[data-gear]'), String(r.gear))
          write(row?.querySelector('[data-mode]'), r.mode)
          row?.querySelector('[data-mode]')?.toggleAttribute('data-on', r.mode === 'Overtake')
          row?.querySelector('.meter')?.toggleAttribute('data-brake', r.brake)

          for (const [j, cell] of [...(row?.querySelectorAll('.meter i') ?? [])].entries()) cell.toggleAttribute('data-on', j < r.cells)
        }
      }

      const follow = () => {
        const d = goal - time.current

        if (d === 0) return

        show(Math.abs(d) < SETTLE ? goal : time.current + d * (1 - (1 - FOLLOW) ** gsap.ticker.deltaRatio()))
      }

      const fromScroll = (progress: number) => {
        const t = progress * end
        const span = st ? st.end - st.start : 0
        const snap = span > 0 ? (SNAP_PX * end) / span : 0

        if (target !== null && Math.abs(t - target) <= snap) {
          goal = target

          return
        }

        target = null
        goal = t
      }

      const seek = (t: number) => {
        goal = Math.min(end, Math.max(0, t))

        if (!st) return show(goal)

        target = goal

        const y = st.start + (goal / end) * (st.end - st.start)
        const lenisNow = scroller.current

        if (lenisNow) lenisNow.scrollTo(y, { immediate: true, force: true })
        else window.scrollTo(0, y)
      }

      if (!REDUCED) {
        st = ScrollTrigger.create({
          trigger: pin,
          start: 'top top',
          end: '+=300%',
          pin: true,
          onUpdate: (self) => fromScroll(self.progress),
          onRefresh: (self) => fromScroll(self.progress),
        })
        fromScroll(st.progress)
        show(goal)
        gsap.ticker.add(follow)
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

      const back = () => prevStep(all, goal)
      const on = () => nextStep(all, goal, end)

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
        gsap.ticker.remove(follow)
        track.removeEventListener('pointerdown', onDown)
        track.removeEventListener('pointermove', onMove)
        track.removeEventListener('keydown', onKey)
      }
    },
    { scope: root, dependencies: [pass, all, end] },
  )

  return (
    <section className="replay cast circuit" data-theme="dark" aria-labelledby="replay" ref={root} style={colours(pass)}>
      <div className="pin">
        <CircuitStage
          info={info}
          near={near}
          lap={null}
          onNear={onNear}
          turns={TURNS}
          focus={focus}
          hud={({ stage, replay, ready }) => <PassHud pass={pass} stage={stage} replay={replay} time={time} ready={ready} />}
        />
        <div className="title">
          <p className="mono label">
            <i className="rec" aria-hidden />
            Replay · Interlagos · T12 → T1
          </p>
          <h2 id="replay" className="display headline">{`About ${km} km to make it stick.`}</h2>
          <p className="intro">A real pass from the 2026 São Paulo Grand Prix, on the real track and slowed down. Scroll to roll it.</p>
        </div>
        <p className="mono who">{`${pass.race} ${pass.year} · Lap ${pass.lap} · ${pass.chaser.code} on ${pass.leader.code} for P${pass.position}`}</p>
        <ol className="chyron">
          {all.map((s) => (
            <li key={s.n} data-step={s.n}>
              <b className="mono">{String(s.n).padStart(2, '0')}</b>
              <div>
                <p className="title-line">{s.title}</p>
                <p className="text">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="strip">
          <table className="board">
            <thead className="mono">
              <tr>
                <th scope="col">Car</th>
                <th scope="col">km/h</th>
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
                    {pass[car].code}
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
            <div className="track" role="slider" tabIndex={0} aria-label="Replay time" aria-valuemin={0} aria-valuemax={Number(end.toFixed(1))} aria-valuenow={0} aria-valuetext={sliderText(all, 0)}>
              <i className="played" />
              <i className="handle" />
              <ol className="mono marks">
                {all.map((s) => (
                  <li key={s.n} data-mark-step={s.n} style={at(s.t, end)}>
                    <b>{s.n}</b>
                  </li>
                ))}
              </ol>
            </div>
            <p className="mono scale">
              <span className="now">0.0 s</span>
              <span>{`/ ${end.toFixed(1)} s`}</span>
            </p>
          </div>
        </div>
      </div>
      <p className="mono foot">Overtake Mode is shown where the rules unlock it. Teams don't publish when a driver presses it.</p>
      <p className="mono credit">{TELEMETRY_CREDIT}</p>
    </section>
  )
}
