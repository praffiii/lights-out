import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react'

import type { CircuitInfo } from '#/circuits/registry.ts'
import { at, barScale, camAt, END, flapFrame, gapText, ghostPace, isLevel, lengthOf, sliderText, START, stops } from '#/drs/model.ts'
import type { GhostFile } from '#/drs/schema.ts'
import { WING_FRAMES } from '#/drs/wing.ts'
import { TEAMS } from '#/home/cars.ts'
import { REDUCED } from '#/motion/motion.ts'
import type { Focus } from '#/pass/model.ts'
import { CircuitStage } from '#/weekend/CircuitStage.tsx'

import { GhostHud } from './GhostHud.tsx'
import { useScrub } from './useScrub.ts'
import { useWing } from './useWing.ts'

type Vars = CSSProperties & Record<`--${string}`, string>

const CREDIT =
  'Speeds: OpenF1 (unofficial), about four samples a second, metres estimated · Map © OpenStreetMap contributors (ODbL) · Layout bacinger/f1-circuits (MIT) · Elevation SRTM (NASA) · Wing: a drawing, not a real car'

const TURNS: ReadonlyArray<{ turn: number }> = []

const COLOURS = new Map(Object.entries(TEAMS).map(([team, t]) => [team, t.colour]))

const write = (el: Element | null, text: string) => {
  if (el && el.textContent !== text) el.textContent = text
}

const state = (open: boolean) => (open ? 'open' : 'shut')

export function GhostLap({ file, info }: { file: GhostFile; info: CircuitInfo }) {
  const root = useRef<HTMLElement>(null)
  const focus = useRef<Focus | null>(camAt(file, REDUCED ? file.end : START))
  const [near, setNear] = useState(false)
  const onNear = useCallback(() => setNear(true), [])
  const wing = useWing(near, flapFrame(REDUCED ? 1 : 0, WING_FRAMES))
  const steps = useMemo(() => stops(file), [file])
  const pace = useMemo(() => ghostPace(file), [file])
  const options = useMemo(() => ({ length: '+=400%', scale: barScale(file) }), [file])
  const last = useMemo(() => at(file, file.end), [file])
  const [on, off] = file.laps
  const pct = (metres: number) => `${((metres / lengthOf(file)) * 100).toFixed(3)}%`
  const vars: Vars = { '--ham': COLOURS.get(file.driver.team) ?? '#fff', '--open': pct(at(file, 0).along), '--end': pct(last.along) }
  const gap = gapText(last)

  const paint = (scope: HTMLElement) => {
    const track = scope.querySelector('[role="slider"]')
    const playhead = scope.querySelector<HTMLElement>('.playhead')
    const gaps = [...scope.querySelectorAll('.gap b, .ahead b')]
    const states = [...scope.querySelectorAll('[data-flap]')]
    const speeds = [scope.querySelector('[data-speed="on"] .num'), scope.querySelector('[data-speed="off"] .num')]
    const end = scope.querySelector('[data-mark="end"]')

    return (t: number) => {
      const now = at(file, t + START)

      focus.current = camAt(file, t + START)
      wing.show(flapFrame(now.flap, WING_FRAMES))
      scope.toggleAttribute('data-open', now.open)
      scope.toggleAttribute('data-level', isLevel(now))
      end?.toggleAttribute('data-lit', t >= END(file) - 0.02)
      track?.setAttribute('aria-valuenow', String(Math.round(now.along)))
      track?.setAttribute('aria-valuetext', sliderText(now))

      if (playhead) playhead.style.left = pct(now.along)

      for (const el of gaps) write(el, gapText(now))

      for (const el of states) write(el, state(now.open))

      for (const [i, el] of speeds.entries()) write(el, String(Math.round(now.laps[i === 0 ? 0 : 1].speed)))
    }
  }

  const { time } = useScrub(root, END(file), steps, pace, paint, options)

  return (
    <section className="ghost cast circuit" data-theme="dark" data-open="" aria-labelledby="ghost" ref={root} style={vars}>
      <div className="pin">
        <CircuitStage info={info} near={near} lap={null} onNear={onNear} turns={TURNS} focus={focus} limit={file.to} hud={({ stage, replay, ready }) => <GhostHud file={file} gap={gap} stage={stage} replay={replay} time={time} ready={ready} />} />
        <div className="title">
          <p className="mono label">
            <i className="rec" aria-hidden />
            <span>
              {`Ghost lap · Miami ${file.year} · `}
              <span className="wide">laps </span>
              {`${on.lap} and ${off.lap}`}
            </span>
          </p>
          <h2 id="ghost" className="display headline">
            <span className="hl">Same car.</span>
            <span className="hl">One lap apart.</span>
          </h2>
          <p className="mono intro">
            Hamilton · same tyres<span className="wide"> · the last long straight</span>
          </p>
        </div>
        <figure className="wing">
          <img src="/wing/open.webp" width={1568} height={904} alt="A drawing of a rear wing with a purple flap between two end plates." />
          <canvas ref={wing.canvas} width={784} height={452} aria-hidden />
          <figcaption className="mono">
            <b className="state">
              Flap · <span data-flap>open</span>
            </b>
            <span className="rule">{`Lap ${on.lap} · within one second`}</span>
          </figcaption>
        </figure>
        <div className="speeds">
          <p className="ahead">
            <span className="mono label">Ahead by</span>
            <b>{gap}</b>
          </p>
          <div data-speed="on">
            <p className="mono label">
              {`Lap ${on.lap} · `}
              <span className="wide">flap </span>
              <span data-flap>open</span>
            </p>
            <p className="display num">{Math.round(last.laps[0].speed)}</p>
          </div>
          <div data-speed="off">
            <p className="mono label">
              {`Lap ${off.lap} · `}
              <span className="wide">flap </span>shut
            </p>
            <p className="display num">{Math.round(last.laps[1].speed)}</p>
          </div>
          <p className="mono unit">km/h</p>
        </div>
        <div className="straight">
          <p className="mono label">{`The straight · ${(lengthOf(file) / 1000).toFixed(1)} km`}</p>
          <div className="lane" role="slider" tabIndex={0} aria-label="Place on the straight" aria-valuemin={Math.round(at(file, START).along)} aria-valuemax={Math.round(last.along)} aria-valuenow={Math.round(last.along)} aria-valuetext={sliderText(last)}>
            <i className="zone" />
            <i className="playhead" style={{ left: pct(last.along) }} />
          </div>
          <ul className="mono marks" aria-hidden>
            <li data-mark="open">
              <span className="wide">Flap </span>opens · level
            </li>
            <li data-mark="end" data-lit="">
              <span className="wide">Zone ends · </span>
              {`${last.seconds.toFixed(1)} s ahead`}
            </li>
          </ul>
        </div>
      </div>
      <p className="mono credit">{CREDIT}</p>
    </section>
  )
}
