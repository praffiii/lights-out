import { type CSSProperties, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { portraitFor } from '#/drivers/portraits.ts'
import { CARS, TEAMS } from '#/home/cars.ts'
import { gsap, REDUCED } from '#/motion/motion.ts'
import { opposite, useTheme } from '#/shell/theme.ts'
import { dateText, driverName, heroText, sliderText, stateText, teamName } from '#/titles/copy.ts'
import { frame, type Row, seasonPace, type Side, stripScale, teamAt, total, won } from '#/titles/model.ts'
import type { Titles } from '#/titles/schema.ts'

import { useScrub } from './useScrub.ts'

type Vars = CSSProperties & Record<`--${string}`, string>

const ROWS = 5

const EDGE = 1e-6

const COLOURS = new Map(Object.entries(TEAMS).map(([team, t]) => [team, t.colour]))

const colourOf = (titles: Titles, team: string | null) => (team === null ? 'var(--muted)' : (COLOURS.get(teamName(titles, team)) ?? 'var(--muted)'))

const tint = (colour: string): Vars => ({ '--team': colour })

const codeOf = (titles: Titles, id: string) => titles.drivers[id]?.code ?? driverName(titles, id).slice(0, 3).toUpperCase()

function Picture({ src, kind }: { src: string | undefined; kind: 'portrait' | 'car' }) {
  return (
    <span className="picture" data-kind={kind}>
      {src ? <img src={src} alt="" loading="lazy" /> : null}
    </span>
  )
}

function useGlide(ids: string) {
  const list = useRef<HTMLOListElement>(null)
  const tops = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const rows = [...(list.current?.querySelectorAll<HTMLElement>('li') ?? [])]
    const before = tops.current

    tops.current = new Map(rows.map((row) => [row.dataset.id ?? '', row.offsetTop]))

    if (REDUCED || before.size === 0) return

    for (const row of rows) {
      const from = before.get(row.dataset.id ?? '')

      if (from === undefined) gsap.fromTo(row, { opacity: 0, y: 0 }, { opacity: 1, duration: 0.5, ease: 'brake', overwrite: true })
      else if (from !== row.offsetTop) gsap.fromTo(row, { y: from - row.offsetTop, opacity: 1 }, { y: 0, duration: 0.5, ease: 'brake', overwrite: true, clearProps: 'transform' })
    }
  }, [ids])

  return list
}

function Half({ titles, which, side, index }: { titles: Titles; which: 'drivers' | 'teams'; side: Side; index: number }) {
  const rows = side.rows.slice(0, ROWS)
  const list = useGlide(rows.map((row) => row.id).join())
  const text = heroText(side)
  const drivers = which === 'drivers'

  const look = (row: Row) => {
    const team = drivers ? teamAt(titles, row.id, index) : row.id

    return {
      name: drivers ? driverName(titles, row.id) : teamName(titles, row.id),
      src: drivers ? portraitFor(titles.drivers[row.id]?.code ?? null)?.src : CARS.find((car) => car.team === teamName(titles, row.id))?.src,
      style: tint(colourOf(titles, team)),
    }
  }

  return (
    <div className="side" data-side={which} data-won={side.wonAt === null ? undefined : ''}>
      <div className="hero-box">
        <h3 className="mono">{drivers ? "Drivers' title" : "Constructors' title"}</h3>
        <p className="mono state">{stateText(side, titles)}</p>
        <p className="display lead">{text.lead}</p>
        <p className="against">
          <span>{text.ahead}</span>
          <span className="left">{text.left}</span>
        </p>
      </div>
      <ol className="tower" ref={list}>
        {rows.map((row) => {
          const { name, src, style } = look(row)

          return (
            <li key={row.id} data-id={row.id} style={style}>
              <span className="mono muted pos">{String(row.position).padStart(2, '0')}</span>
              <Picture src={src} kind={drivers ? 'portrait' : 'car'} />
              <span className="name">{name}</span>
              {drivers ? null : <span className="mono muted split">{row.split.map((s) => s.points).join(' + ')}</span>}
              <span className="mono gain">{`+${row.gain}`}</span>
              <span className="pts">{row.points}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Tags({ titles, index }: { titles: Titles; index: number }) {
  const at = won(titles)
  const all = total(titles)

  const wins = [
    ["Drivers' title", at.drivers],
    ["Teams' title", at.teams],
  ] as const

  const both = at.drivers !== null && at.drivers === at.teams
  const list = (both ? ([['Both titles', at.drivers]] as const) : wins).flatMap(([text, i]) => (i === null ? [] : [{ text, i }])).sort((a, b) => a.i - b.i)
  const [first, second] = list

  const vars = (i: number): Vars => ({ '--from': `${((i / all) * 100).toFixed(3)}%`, '--to': `${(((i + 1) / all) * 100).toFixed(3)}%`, '--next': second ? `${((second.i / all) * 100).toFixed(3)}%` : '100%' })

  return (
    <div className="tags">
      {list.map(({ text, i }) => (
        <span key={text} className="tag mono" data-place={second && i === first?.i ? 'first' : 'last'} data-on={i <= index ? '' : undefined} style={vars(i)}>
          <b>{text}</b>
        </span>
      ))}
    </div>
  )
}

export function SeasonRace({ titles }: { titles: Titles }) {
  const root = useRef<HTMLElement>(null)
  const { theme } = useTheme()
  const last = titles.rounds.length - 1
  const [index, setIndex] = useState(last)
  const stops = useMemo(() => titles.rounds.map((_, i) => i), [titles])
  const pace = useMemo(() => seasonPace(titles), [titles])
  const options = useMemo(() => ({ length: '+=500%', scale: stripScale(titles) }), [titles])
  const f = useMemo(() => frame(titles, index), [titles, index])
  const all = total(titles)
  const at = won(titles)
  const cells = [...titles.rounds, ...titles.left]

  useScrub(root, last, stops, pace, () => (t) => setIndex(Math.floor(t + EDGE)), options)

  return (
    <section className="season-race" data-theme={theme ? opposite(theme) : undefined} aria-labelledby="season-race" ref={root}>
      <div className="pin">
        <header className="head">
          <div>
            <p className="mono muted">{`The ${titles.season} season · race by race`}</p>
            <h2 id="season-race" className="display headline">
              <span className="hl">Two leads.</span>
              <span className="hl">Two finish lines.</span>
            </h2>
          </div>
          <div className="when">
            <p className="display number" data-round>
              {f.round.round}
            </p>
            <p className="mono muted rd">Round</p>
            <p className="mono muted of">
              <span className="small">{`Round ${f.round.round} `}</span>
              {`of ${all}`}
            </p>
            <p className="place">{f.round.locality}</p>
            <p className="mono muted day">{dateText(f.round.date)}</p>
            <p className="mono muted winner">{`${driverName(titles, f.round.winner)} wins`}</p>
          </div>
        </header>
        <div className="sides">
          <Half titles={titles} which="drivers" side={f.drivers} index={f.index} />
          <Half titles={titles} which="teams" side={f.teams} index={f.index} />
        </div>
        <div className="strip">
          <p className="mono muted strip-label">
            <span>Race winners</span>
            <span className="key">S · sprint weekend</span>
          </p>
          <div className="track" role="slider" tabIndex={0} aria-label="Round" aria-valuemin={1} aria-valuemax={all} aria-valuenow={f.round.round} aria-valuetext={sliderText(titles, f)}>
            <ol className="cells" aria-hidden>
              {cells.map((cell, i) => {
                const done = titles.rounds[i]

                return (
                  <li
                    key={cell.round}
                    data-n={cell.round}
                    data-done={done ? '' : undefined}
                    data-past={i <= f.index ? '' : undefined}
                    data-now={i === f.index ? '' : undefined}
                    data-lock={i === at.drivers || i === at.teams ? '' : undefined}
                    data-sprint={cell.sprint ? '' : undefined}
                    style={done ? tint(colourOf(titles, teamAt(titles, done.winner, i))) : undefined}
                  >
                    <span className="mono n">{cell.round}</span>
                    <span className="mono code">{done && i <= f.index ? codeOf(titles, done.winner) : ''}</span>
                  </li>
                )
              })}
            </ol>
          </div>
          <Tags titles={titles} index={f.index} />
          <p className="mono law">A title is won when the lead is bigger than all the points left.</p>
        </div>
      </div>
      <p className="mono muted credit">Points and results: Jolpica F1 API · sprints counted · if points are level, race wins decide</p>
    </section>
  )
}
