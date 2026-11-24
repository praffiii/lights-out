import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react'

import type { CircuitInfo } from '#/circuits/registry.ts'
import { camAt, END, type Lead, readout, sliderText, stepAt, steps, surname } from '#/fight/model.ts'
import type { FightFile } from '#/fight/schema.ts'
import { TEAMS } from '#/home/cars.ts'
import { REDUCED } from '#/motion/motion.ts'
import type { Focus } from '#/pass/model.ts'
import { CircuitStage, TELEMETRY_CREDIT } from '#/weekend/CircuitStage.tsx'

import { FightHud } from './FightHud.tsx'
import { linearPace, stepPace } from './pace.ts'
import { useScrub } from './useScrub.ts'

type Vars = CSSProperties & Record<`--${string}`, string>

type Steps = NonNullable<ReturnType<typeof steps>>

const CELLS = 5

const LIVE = 0.4

const WIDE_SHARE = 0.1

const CREDIT = `${TELEMETRY_CREDIT}, about four samples a second · Lock-up: race reports`

const TURNS = [{ turn: 1 }, { turn: 3 }, { turn: 9 }]

const COLOURS = new Map(Object.entries(TEAMS).map(([team, t]) => [team, t.colour]))

const write = (el: Element | null | undefined, text: string) => {
  if (el && el.textContent !== text) el.textContent = text
}

const pct = (t: number) => `${((t / END) * 100).toFixed(3)}%`

const at = (t: number): Vars => ({ '--at': pct(t) })

export function Fight({ file, all, lead, info }: { file: FightFile; all: Steps; lead: ReadonlyArray<Lead>; info: CircuitInfo }) {
  const root = useRef<HTMLElement>(null)
  const focus = useRef<Focus | null>(camAt(file, REDUCED ? END : 0))
  const [near, setNear] = useState(false)
  const onNear = useCallback(() => setNear(true), [])
  const stops = useMemo(() => all.map((s) => s.t), [all])
  const pace = useMemo(() => stepPace(stops, END), [stops])
  const options = useMemo(() => ({ length: '+=500%', scale: linearPace(END) }), [])
  const [first, last] = file.laps
  const colour = (who: 0 | 1) => COLOURS.get(file.cars[who].team) ?? '#fff'
  const vars: Vars = { '--c0': colour(0), '--c1': colour(1) }

  const paint = (scope: HTMLElement) => {
    const track = scope.querySelector('[role="slider"]')
    const body = scope.querySelector('.board tbody')
    const rows = file.cars.map((c) => scope.querySelector(`tr[data-car="${c.code}"]`))
    const marks = [...scope.querySelectorAll<HTMLElement>('[data-step], [data-mark-step]')]
    const playhead = scope.querySelector<HTMLElement>('.playhead')

    scope.toggleAttribute('data-still', REDUCED)

    return (t: number) => {
      const now = readout(file, lead, t)
      const n = stepAt(all, t)

      focus.current = camAt(file, t)
      scope.toggleAttribute('data-live', t > LIVE)
      track?.setAttribute('aria-valuenow', t.toFixed(1))
      track?.setAttribute('aria-valuetext', sliderText(file, all, lead, t))

      if (playhead) playhead.style.left = pct(t)

      for (const el of marks) {
        const s = Number(el.dataset.step ?? el.dataset.markStep)

        el.toggleAttribute('data-lit', s <= n)
        el.toggleAttribute('data-current', s === n)
      }

      for (const [i, row] of rows.entries()) {
        const r = now.rows[i]

        if (!row || !r) continue

        write(row.querySelector('[data-speed]'), String(r.speed))
        write(row.querySelector('[data-gap]'), r.gap)
        write(row.querySelector('[data-gear]'), String(r.gear))
        row.querySelector('.meter')?.toggleAttribute('data-brake', r.brake)

        for (const [j, cell] of [...row.querySelectorAll('.meter i')].entries()) cell.toggleAttribute('data-on', j < r.cells)
      }

      const top = rows[now.leader]

      if (body && top && body.firstElementChild !== top) body.insertBefore(top, body.firstElementChild)
    }
  }

  const { time } = useScrub(root, END, stops, pace, paint, options)

  return (
    <section className="fight cast circuit" data-theme="dark" aria-labelledby="fight" ref={root} style={vars}>
      <div className="pin">
        <CircuitStage info={info} near={near} lap={null} onNear={onNear} turns={TURNS} focus={focus} hud={({ stage, replay, ready }) => <FightHud file={file} lead={lead} stage={stage} replay={replay} time={time} ready={ready} />} />
        <div className="title">
          <p className="mono label">
            <i className="rec" aria-hidden />
            {`Replay · ${info.name} · Laps ${first} to ${last}`}
          </p>
          <h2 id="fight" className="display headline">
            <span className="hl">Four lead changes.</span>
            <span className="hl">Eighty seconds.</span>
          </h2>
          <p className="mono intro">
            {`${file.race} ${file.year}`}
            <span className="wide">{` · ${surname(file.cars[1].name)} v ${surname(file.cars[0].name)}`}</span> · for the lead
          </p>
        </div>
        <div className="panel">
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
          <table className="board">
            <thead className="mono">
              <tr>
                <th scope="col">Car</th>
                <th scope="col">km/h</th>
                <th scope="col">Gap</th>
                <th scope="col">Gear</th>
                <th scope="col">Throttle</th>
              </tr>
            </thead>
            <tbody>
              {file.cars.map((c) => (
                <tr key={c.code} data-car={c.code}>
                  <th scope="row" className="mono">
                    {c.code}
                  </th>
                  <td data-speed />
                  <td data-gap />
                  <td data-gear />
                  <td>
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
        </div>
        <div className="led">
          <p className="mono who-leads">Who leads</p>
          <div className="lead-bar" role="slider" tabIndex={0} aria-label="Replay time" aria-valuemin={0} aria-valuemax={END} aria-valuenow={0} aria-valuetext={sliderText(file, all, lead, 0)}>
            {lead.map((l) => {
              const share = (l.to - l.from) / END

              return (
                <span key={l.from} className="stretch-of mono" data-who={l.who} data-share={share} style={{ left: pct(l.from), width: pct(l.to - l.from) }}>
                  {share > WIDE_SHARE ? file.cars[l.who].code : null}
                </span>
              )
            })}
            <i className="playhead" />
          </div>
          <ol className="mono marks" aria-hidden>
            {all.map((s) => (
              <li key={s.n} data-mark-step={s.n} style={at(s.t)}>
                <b>{s.n}</b>
                <span>{s.mark}</span>
              </li>
            ))}
          </ol>
          <p className="mono marks-line" aria-hidden>
            1 Turn 3 · 2 Turn 9 · 3 Turn 1 · 4 Exit
          </p>
        </div>
      </div>
      <p className="mono credit">{CREDIT}</p>
    </section>
  )
}
