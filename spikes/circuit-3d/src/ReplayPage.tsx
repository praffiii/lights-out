import { useCallback, useEffect, useRef } from 'react'
import { type Frame, frameAt, type Mode, REPLAY, STEPS, stepAt } from './replay-data'
import { damp, scrollProgress } from './shaders'
import { opposite, type Theme } from './tokens'

const CARS = { chaser: 'Chaser', leader: 'Leader' } as const
const MODE: Record<Mode, string> = { straight: 'Straight', overtake: 'Overtake', corner: 'Corner' }
const ROWS = ['chaser', 'leader'] as const

/** Writes one frame into the table and moves the cars on the map, without a React render. */
function paint(root: HTMLElement, t: number, f: Frame) {
  const set = (sel: string, text: string) => {
    const el = root.querySelector(sel)
    if (el && el.textContent !== text) el.textContent = text
  }
  for (const car of ROWS) {
    set(`[data-cell="${car}-speed"]`, `${f.speed[car]} km/h`)
    set(`[data-cell="${car}-gear"]`, String(f.gear[car]))
    set(`[data-cell="${car}-mode"]`, MODE[f.mode[car]])
    root.querySelector(`[data-cell="${car}-mode"]`)?.classList.toggle('hot', f.mode[car] === 'overtake')
    root.querySelectorAll(`[data-cell="${car}-battery"] i`).forEach((cell, i) => cell.classList.toggle('on', i < Math.round(f.battery[car])))
  }
  set('[data-cell="chaser-gap"]', f.gap === null ? 'Ahead' : `${f.gap.toFixed(2)} s`)
  set('[data-cell="leader-gap"]', f.gap === null ? 'Behind' : 'Ahead')
  set('[data-cell="time"]', `${t.toFixed(1)} s`)
  root.querySelector<HTMLElement>('.timeline .fill')?.style.setProperty('scale', `${t / REPLAY.duration} 1`)
  const step = stepAt(t)
  root.querySelectorAll('.timeline li').forEach((li, i) => li.classList.toggle('on', i <= step && t >= STEPS[0].at))
  set('[data-cell="step-n"]', String(step + 1))
  set('[data-cell="step-title"]', STEPS[step].title)
  set('[data-cell="step-body"]', STEPS[step].body)
  for (const car of ROWS) {
    const pin = root.querySelector<HTMLElement>(`[data-pin="${car}"]`)
    if (pin) pin.style.translate = `${f.at[car][0] * 100}cqw ${f.at[car][1] * 100}cqh`
    // side by side, each tag goes on the far side of its car from the other one
    pin?.classList.toggle('above', f.at[car][1] <= f.at[car === 'chaser' ? 'leader' : 'chaser'][1])
  }
}

/** Scroll drives the replay clock, damped so a flick of the wheel still reads as motion. */
function useScrollClock(onTime: (t: number) => void, on: boolean) {
  useEffect(() => {
    if (!on) return
    let p = scrollProgress()
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      p = damp(p, scrollProgress(), Math.min((now - last) / 1000, 0.1))
      last = now
      onTime(p * REPLAY.duration)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onTime, on])
}

const { map } = REPLAY
const pct = ([x, y]: readonly [number, number]) => ({ left: `${x * 100}%`, top: `${y * 100}%` })

/** The live-timing map: the lap, the stretch the replay covers, the detection line, and the two cars. */
function ReplayMap() {
  const [[x1, y1], [x2, y2]] = map.detect
  const outer = x1 < x2 ? map.detect[0] : map.detect[1] // the left end on screen, where the map is empty
  return (
    <>
      <svg className="map" viewBox={`0 0 ${map.width} ${map.height}`} aria-hidden>
        <path className="lap" d={map.lap} />
        <path className="stretch" d={map.stretch} />
        <line className="detect" x1={x1 * map.width} y1={y1 * map.height} x2={x2 * map.width} y2={y2 * map.height} />
      </svg>
      <div className="pins" aria-hidden>
        {Object.entries(map.turns).map(([n, at]) => <span key={n} className="turn" style={pct(at)}>{n}</span>)}
        <span className="tag tag-detect" style={pct(outer)}>Detection</span>
      </div>
      <div className="cars" aria-hidden>
        {ROWS.map((car) => (
          <span key={car} data-pin={car} className={`car car-${car}`}><i /><b className="tag">{CARS[car]}</b></span>
        ))}
      </div>
    </>
  )
}

export function ReplayPage({ theme, poster }: { theme: Theme; poster: boolean }) {
  const stage = opposite(theme) // the chapter's signature section inverts the page
  const root = useRef<HTMLElement>(null)
  const posterT = REPLAY.posterFrame / REPLAY.fps
  const onTime = useCallback((t: number) => root.current && paint(root.current, t, frameAt(t)), [])
  const ref = useCallback((el: HTMLElement | null) => {
    root.current = el
    if (el && poster) paint(el, posterT, frameAt(posterT))
  }, [poster, posterT])
  useScrollClock(onTime, !poster)

  return (
    <section className="stage replay" data-theme={stage} ref={ref} aria-labelledby="replay-title">
      <header className="head split">
        <div>
          <p className="label">The replay · Interlagos, Turn 12 to Turn 1</p>
          <h2 id="replay-title">About 1.2 km to make it stick.</h2>
        </div>
        <p className="label hot">Sample data</p>
      </header>

      <div className="frame" role="img" aria-label="Map of Interlagos from Turn 12 to Turn 1: two cars run up the start straight, the purple chaser closing on the leader and passing on the inside into Turn 1.">
        <ReplayMap />
        <div className="caption">
          <span className="num" data-cell="step-n">1</span>
          <p>
            <strong data-cell="step-title">{STEPS[0].title}</strong>
            <span data-cell="step-body">{STEPS[0].body}</span>
          </p>
        </div>
      </div>

      <table className="telemetry">
        <thead>
          <tr className="label"><th>Car</th><th>Speed</th><th>Gap</th><th>Gear</th><th>Mode</th><th>Battery</th></tr>
        </thead>
        <tbody>
          {ROWS.map((car) => (
            <tr key={car} className={car}>
              <th>{car === 'chaser' ? 'Chaser' : 'Leader'}</th>
              <td data-cell={`${car}-speed`}>0 km/h</td>
              <td data-cell={`${car}-gap`}>–</td>
              <td data-cell={`${car}-gear`}>1</td>
              <td data-cell={`${car}-mode`}>Straight</td>
              <td data-cell={`${car}-battery`} className="battery">{[0, 1, 2, 3, 4].map((i) => <i key={i} />)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="timeline">
        <div className="label times"><span>0.0 s</span><span data-cell="time">0.0 s</span><span>{REPLAY.duration.toFixed(1)} s</span></div>
        <div className="track">
          <div className="fill" />
          {STEPS.map((s) => <i key={s.title} style={{ left: `${(s.at / REPLAY.duration) * 100}%` }} />)}
        </div>
        <ol>
          {STEPS.map((s, i) => (
            <li key={s.title} className="label">
              <span className="num">{i + 1}</span>{s.title} · {s.at.toFixed(1)} s
            </li>
          ))}
        </ol>
        <p className="label credit">
          Scroll to drive the replay · sample numbers · layout bacinger/f1-circuits (MIT) · lanes drawn 4x wider than real
        </p>
      </div>
    </section>
  )
}
