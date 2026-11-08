import { type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

import { circuitFor } from '#/circuits/registry.ts'
import { gsap, REDUCED } from '#/motion/motion.ts'
import type { Race } from '#/season/jolpica-schema.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { useSeason } from '#/season/use-season.ts'
import { boxCopy, boxState, gpName, latestStart, pickRace, SESSION_LABEL, sessionDay, when } from '#/season/weekend.ts'

import { Soon } from './Go.tsx'
import { opposite, useTheme } from './theme.ts'

const TABS = ['Now', 'Next', 'Latest', 'Standings'] as const

type Tab = (typeof TABS)[number]

const STEPS = new Map([
  ['ArrowRight', 1],
  ['ArrowLeft', -1],
])

function useSecond() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let last = Math.floor(Date.now() / 1000)

    const tick = () => {
      const second = Math.floor(Date.now() / 1000)

      if (second === last) return

      last = second
      setNow(new Date())
    }

    gsap.ticker.add(tick)

    return () => gsap.ticker.remove(tick)
  }, [])

  return now
}

export function WeekendBox() {
  const season = useSeason()

  return season.data ? <Box snapshot={season.data} /> : null
}

function Box({ snapshot }: { snapshot: SeasonSnapshot }) {
  const now = useSecond()
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('Now')
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()
  const state = boxState(snapshot, now)

  useLayoutEffect(() => {
    const el = panel.current

    if (!el) return

    gsap.killTweensOf(el)

    if (open) {
      el.hidden = false
      gsap.fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: REDUCED ? 0 : 0.4, ease: 'brake' })
    } else if (!el.hidden) {
      gsap.to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: REDUCED ? 0 : 0.3, ease: 'launch', onComplete: () => void (el.hidden = true) })
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const away = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('pointerdown', away)

    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return

    setOpen(false)
    button.current?.focus()
  }

  return (
    <div className="weekend-box" ref={root} onKeyDown={onKey}>
      <button ref={button} type="button" className="weekend mono" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {state.kind === 'live' && (
          <>
            <span className="live">
              <i aria-hidden />
              Live
            </span>
            <span className="sep" aria-hidden>
              |
            </span>
          </>
        )}
        {boxCopy(state).map((segment, i) => (
          <span key={segment.value} className="seg-part">
            {i > 0 && (
              <span className="sep" aria-hidden>
                |
              </span>
            )}
            {segment.label && <span className="label">{segment.label}</span>}
            <b>{segment.value}</b>
          </span>
        ))}
        <span className="chev" aria-hidden>
          ↓
        </span>
      </button>
      <div ref={panel} id={id} className="weekend-panel" data-theme={theme ? opposite(theme) : undefined} hidden>
        <Tabs tab={tab} onTab={setTab} id={id} />
        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`}>
          {tab === 'Now' && <NowTab snapshot={snapshot} now={now} />}
          {tab === 'Next' && <NextTab snapshot={snapshot} now={now} />}
          {tab === 'Latest' && <LatestTab snapshot={snapshot} />}
          {tab === 'Standings' && <StandingsTab snapshot={snapshot} now={now} />}
        </div>
      </div>
    </div>
  )
}

function Tabs({ tab, onTab, id }: { tab: Tab; onTab: (tab: Tab) => void; id: string }) {
  const list = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const active = list.current?.querySelector<HTMLElement>('[aria-selected="true"]')

    if (!active || !line.current) return

    line.current.style.transform = `translateX(${active.offsetLeft}px) scaleX(${active.offsetWidth})`
  }, [tab])

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = STEPS.get(event.key)

    if (!step) return

    event.preventDefault()

    const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length] ?? tab

    onTab(next)
    list.current?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-${next}`)}`)?.focus()
  }

  return (
    <div ref={list} className="tabs mono" role="tablist" aria-label="Race weekend" onKeyDown={onKey}>
      {TABS.map((name) => (
        <button
          key={name}
          id={`${id}-${name}`}
          type="button"
          role="tab"
          aria-selected={name === tab}
          aria-controls={`${id}-panel`}
          tabIndex={name === tab ? 0 : -1}
          onClick={() => onTab(name)}
        >
          {name}
        </button>
      ))}
      <span ref={line} className="tab-line" aria-hidden />
    </div>
  )
}

const Row = ({ label, value, end, lead }: { label: string; value: string; end?: string; lead?: boolean }) => (
  <div className={lead ? 'entry p1' : 'entry'}>
    <span className="mono">{label}</span>
    <span className={end === undefined ? 'value' : 'name'}>{value}</span>
    {end !== undefined && <span className="mono end">{end}</span>}
  </div>
)

const trackZone = (race: Race) => circuitFor(race.circuit.circuitId)?.tz

const zoneName = (at: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(at).find((part) => part.type === 'timeZoneName')?.value ?? ''

function NowTab({ snapshot, now }: { snapshot: SeasonSnapshot; now: Date }) {
  const race = pickRace(snapshot, now)?.race

  if (!race) return <p className="sub">No race on the calendar yet.</p>

  const info = circuitFor(race.circuit.circuitId)
  const tz = trackZone(race)
  const at = tz ? when(now.toISOString(), tz) : null

  return (
    <>
      <h3>{gpName(race)}</h3>
      <p className="sub">
        {race.circuit.circuitName}, {info?.name ?? race.circuit.locality}
      </p>
      <div className="entries">
        {tz && at && <Row label="Track time" value={`${at.track} ${zoneName(now, tz)} · ${at.yours.replace(/ \(.*\)$/, '')} yours`} />}
        {info && <Row label="Lap" value={`${info.facts.lengthKm} km`} />}
        {info && <Row label="Race" value={`${info.facts.laps} laps`} />}
      </div>
      <Soon className="mono more">Race weekend page</Soon>
    </>
  )
}

function NextTab({ snapshot, now }: { snapshot: SeasonSnapshot; now: Date }) {
  const t = now.getTime()

  const next = [...snapshot.calendar, ...snapshot.nextCalendar]
    .flatMap((race) => race.sessions.map((session) => ({ race, session })))
    .filter(({ session }) => latestStart(session) > t)
    .sort((a, b) => Date.parse(a.session.startsAt) - Date.parse(b.session.startsAt))[0]

  if (!next) return <p className="sub">The next calendar is not out yet.</p>

  const tz = trackZone(next.race)
  const at = tz ? when(next.session.startsAt, tz) : null
  const day = tz ? sessionDay(next.session, tz) : null
  const left = Math.floor((Date.parse(next.session.startsAt) - t) / 1000)

  return (
    <>
      <h3>{SESSION_LABEL[next.session.name]}</h3>
      <p className="sub">
        {gpName(next.race)}
        {at && day && (next.session.timeConfirmed ? ` · ${day} · ${at.track} at the track · ${at.yours} your time` : ` · ${day} · time TBC`)}
      </p>
      {next.session.timeConfirmed && (
        <div className="count">
          {[
            ['days', left / 86_400],
            ['hr', (left % 86_400) / 3600],
            ['min', (left % 3600) / 60],
            ['sec', left % 60],
          ].map(([unit, n]) => (
            <div key={unit}>
              <strong>{String(Math.floor(Number(n))).padStart(2, '0')}</strong>
              <span className="mono">{unit}</span>
            </div>
          ))}
        </div>
      )}
      <Soon className="mono more">Full weekend schedule</Soon>
    </>
  )
}

const fullName = (driver: { givenName: string; familyName: string }) => `${driver.givenName} ${driver.familyName}`

function LatestTab({ snapshot }: { snapshot: SeasonSnapshot }) {
  const result = snapshot.latest?.race
  const ref = result?.race
  const race = ref ? snapshot.calendar.find((r) => r.season === ref.season && r.round === ref.round) : undefined
  const rows = result?.rows.slice(0, 3) ?? []
  const winner = rows[0]

  if (!ref || !winner) return <p className="sub">No results yet this season.</p>

  const raceSession = race?.sessions.find((session) => session.name === 'Race')
  const tz = race ? trackZone(race) : undefined
  const day = raceSession && tz ? sessionDay(raceSession, tz) : null

  return (
    <>
      <h3>{race ? gpName(race) : ref.raceName}</h3>
      <p className="sub">
        Race{day ? ` · ${day}` : ''} · {winner.driver.familyName} wins
      </p>
      <div className="entries">
        {rows.map((row) => (
          <Row key={row.driver.driverId} label={`P${row.position}`} value={fullName(row.driver)} end={row.constructor.name} lead={row.position === 1} />
        ))}
      </div>
      <Soon className="mono more">Full result</Soon>
    </>
  )
}

function StandingsTab({ snapshot, now }: { snapshot: SeasonSnapshot; now: Date }) {
  const standings = snapshot.driverStandings
  const rows = standings?.rows.slice(0, 3) ?? []
  const left = snapshot.calendar.filter((race) => race.sessions.some((session) => session.name === 'Race' && Date.parse(session.startsAt) > now.getTime())).length

  if (!standings || rows.length === 0) return <p className="sub">No standings yet this season.</p>

  return (
    <>
      <h3>Drivers</h3>
      <p className="sub">
        {standings.season} season · {left === 0 ? 'complete' : `${left} ${left === 1 ? 'race' : 'races'} left`}
      </p>
      <div className="entries">
        {rows.map((row, i) => (
          <Row key={row.driver.driverId} label={`P${row.position ?? i + 1}`} value={fullName(row.driver)} end={`${row.points} pts`} lead={i === 0} />
        ))}
      </div>
      <Soon className="mono more">This season</Soon>
    </>
  )
}
