import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react'

import type { CircuitInfo } from '#/circuits/registry.ts'
import { CARS, TEAMS } from '#/home/cars.ts'
import { REDUCED } from '#/motion/motion.ts'
import { type Focus, type Step, stepAt } from '#/pass/model.ts'
import { opposite, useTheme } from '#/shell/theme.ts'
import { ageText, camAt, endOf, lapAt, positionAt, sliderText, statusAt, tyreAt, type Which, windowLaps } from '#/tyres/model.ts'
import type { UndercutFile } from '#/tyres/schema.ts'
import { CircuitStage } from '#/weekend/CircuitStage.tsx'

import { progressAt, stepPace } from './pace.ts'
import { UndercutHud } from './UndercutHud.tsx'
import { useScrub } from './useScrub.ts'

type Vars = CSSProperties & Record<`--${string}`, string>

type Steps = readonly [Step, Step, Step, Step]

const ORDER = ['late', 'early'] as const

const LINES: Record<Which, string> = { late: 'Leader · mediums from the start', early: 'P2 · 2.2 s behind · same mediums' }

const CREDIT = 'Positions OpenF1 (unofficial) · Layout bacinger/f1-circuits (MIT) · Elevation SRTM (NASA) · Map © OpenStreetMap contributors (ODbL)'

const COLOURS = new Map(Object.entries(TEAMS).map(([team, t]) => [team, t.colour]))

const surname = (name: string) => name.split(' ').at(-1) ?? name

const colours = (file: UndercutFile): Vars => ({ '--early': COLOURS.get(file.early.team) ?? '#fff', '--late': COLOURS.get(file.late.team) ?? '#fff' })

const write = (el: Element | null | undefined, text: string) => {
  if (el && el.textContent !== text) el.textContent = text
}

const TURNS = [{ turn: 19 }, { turn: 1 }]

export function Undercut({ file, all, info }: { file: UndercutFile; all: Steps; info: CircuitInfo }) {
  const root = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const end = endOf(file)
  const focus = useRef<Focus | null>(camAt(file, all, REDUCED ? end : 0))
  const [near, setNear] = useState(false)
  const onNear = useCallback(() => setNear(true), [])
  const stops = useMemo(() => all.map((s) => s.t), [all])
  const pace = useMemo(() => stepPace([all[1].t, all[2].t, all[3].t], end), [all, end])
  const [first, last] = windowLaps(file)
  const late = surname(file.late.name)

  const segs = [
    ['Box first', 'Box'],
    ['New tyres', 'Tyres'],
    [`${late} boxes`, late],
    ['Out behind', 'Out'],
  ] as const

  const paint = (scope: HTMLElement) => {
    const track = scope.querySelector('[role="slider"]')
    const lap = scope.querySelector('[data-lap]')
    const body = scope.querySelector<HTMLTableSectionElement>('.tower tbody')
    const rows = new Map(ORDER.map((which) => [which, scope.querySelector(`tr[data-car="${which}"]`)]))
    const cards = [...scope.querySelectorAll<HTMLElement>('[data-step]')]
    const bars = [...scope.querySelectorAll<HTMLElement>('[data-seg]')]

    return (t: number) => {
      const n = stepAt(all, t)
      const p = progressAt(pace, t)

      focus.current = camAt(file, all, t)
      track?.setAttribute('aria-valuenow', t.toFixed(1))
      track?.setAttribute('aria-valuetext', sliderText(file, all, t))
      write(lap, `Lap ${lapAt(file, t)} of ${file.totalLaps}`)

      for (const el of cards) el.toggleAttribute('data-current', Number(el.dataset.step) === n)

      for (const [i, el] of bars.entries()) {
        const fill = Math.min(1, Math.max(0, p * bars.length - i))

        el.style.setProperty('--fill', fill.toFixed(4))
        el.toggleAttribute('data-current', fill > 0 && fill < 1)
      }

      for (const [which, row] of rows) {
        const tyre = tyreAt(file[which], t)
        const status = statusAt(file, which, t)
        const badge = row?.querySelector<HTMLElement>('.badge')
        const pill = row?.querySelector<HTMLElement>('[data-status]')

        write(row?.querySelector('[data-pos]'), String(positionAt(file, which, t)))
        write(badge, tyre.letter)
        badge?.setAttribute('data-compound', tyre.compound)
        write(row?.querySelector('[data-age]'), ageText(tyre.age))
        write(pill, status)
        pill?.setAttribute('data-status', status)
      }

      const top = positionAt(file, 'early', t) < positionAt(file, 'late', t) ? 'early' : 'late'
      const lead = rows.get(top)

      if (body && lead && body.firstElementChild !== lead) body.insertBefore(lead, body.firstElementChild)
    }
  }

  const { time } = useScrub(root, end, stops, pace, paint)

  return (
    <section className="undercut" data-theme={theme ? opposite(theme) : undefined} aria-labelledby="replay" style={colours(file)}>
      <div className="head">
        <p className="mono label">{`The replay · ${file.race}, laps ${first} to ${last}`}</p>
        <p className="mono tag">{`${file.race} ${file.year} · ${surname(file.early.name)} undercuts ${late}`}</p>
        <h2 id="replay" className="display headline">
          <span className="hl">The undercut</span>
          <span className="hl">{`that won ${file.race}.`}</span>
        </h2>
        <p className="body">Norris led on mediums he had run since the start. Antonelli sat 2.2 s behind on the same tyres. Mercedes called him in first. Scroll to roll it, lap by lap.</p>
      </div>
      <ul className="cards">
        {ORDER.map((which) => {
          const car = file[which]
          const photo = CARS.find((c) => c.code === car.code)

          return (
            <li key={which} data-car={which}>
              <div className="shot">{photo ? <img src={photo.src} alt={`${car.name}'s ${car.team} in qualifying at Shanghai.`} loading="lazy" /> : null}</div>
              <p className="mono chip">{`Boxes lap ${car.stop.lap}`}</p>
              <p className="display ghost" aria-hidden>
                {car.number}
              </p>
              <div className="who">
                <p className="mono team">{`${car.code} · ${car.team}`}</p>
                <p className="display name">{car.name}</p>
                <p className="mono line">{LINES[which]}</p>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mono muted credit">Both cars in qualifying · Shanghai, 2026 · Photos Liauzh · CC BY 4.0, via Wikimedia Commons</p>
      <div className="replay cast circuit" data-theme="dark" ref={root}>
        <div className="pin">
          <CircuitStage
            info={info}
            near={near}
            lap={null}
            onNear={onNear}
            turns={TURNS}
            focus={focus}
            pit={file.pit.points}
            hud={({ stage, replay, ready }) => <UndercutHud file={file} stage={stage} replay={replay} time={time} ready={ready} />}
          />
          <p className="mono label rec-line">
            <i className="rec" aria-hidden />
            {`Replay · ${file.race} · `}
            <span data-lap>{`Lap ${first} of ${file.totalLaps}`}</span>
          </p>
          <p className="mono who">{`${surname(file.early.name)} undercuts ${late} · OpenF1`}</p>
          <div className="deck">
            <ol className="steps">
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
            <table className="tower">
              <thead className="mono">
                <tr>
                  <th scope="col">Pos</th>
                  <th scope="col">Driver</th>
                  <th scope="col">Tyre</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {ORDER.map((which) => (
                  <tr key={which} data-car={which}>
                    <td className="mono" data-pos>
                      {positionAt(file, which, 0)}
                    </td>
                    <th scope="row">{file[which].code}</th>
                    <td className="mono">
                      <span className="badge" data-compound={tyreAt(file[which], 0).compound}>
                        {tyreAt(file[which], 0).letter}
                      </span>
                      <span data-age>{ageText(tyreAt(file[which], 0).age)}</span>
                    </td>
                    <td>
                      <span className="mono" data-status="" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="segs" role="slider" tabIndex={0} aria-label="Replay time" aria-valuemin={0} aria-valuemax={Number(end.toFixed(1))} aria-valuenow={0} aria-valuetext={sliderText(file, all, 0)}>
              {segs.map(([full, short], i) => (
                <span key={full} className="mono" data-seg={i + 1}>
                  <span className="full">{`${String(i + 1).padStart(2, '0')} ${full}`}</span>
                  <span className="short">{`${String(i + 1).padStart(2, '0')} ${short}`}</span>
                  <i />
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="mono credit">{CREDIT}</p>
      </div>
    </section>
  )
}
