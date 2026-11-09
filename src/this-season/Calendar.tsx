import { type KeyboardEvent, type PointerEvent, useId, useRef, useState } from 'react'

import { grandPrix, tileSrc } from '#/circuits/calendar.ts'
import { useSecond } from '#/motion/client.ts'
import { type CalendarTile, calendarHead, calendarTiles } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { opposite, type Theme, useTheme } from '#/shell/theme.ts'

type Open = { round: number; locked: boolean }

const two = (n: number) => String(n).padStart(2, '0')

function Card({ id, tile, theme }: { id: string; tile: CalendarTile; theme: Theme }) {
  const { circuit } = tile

  if (!circuit) return null

  return (
    <div id={id} role="tooltip" className="card" data-theme={opposite(theme)}>
      <img src={circuit.photo.small} alt="" width={360} height={196} />
      <p className="title">
        R{tile.round} · {grandPrix(circuit.gp)}
      </p>
      <p className="mono facts">
        {circuit.name} · {circuit.lengthKm} km · {circuit.laps} laps
      </p>
      <p className="mono credit">{`${circuit.photo.place} · ${circuit.photo.credit}`}</p>
    </div>
  )
}

function Tile({ tile, theme, open, setOpen }: { tile: CalendarTile; theme: Theme; open: Open | null; setOpen: (open: Open | null) => void }) {
  const id = useId()
  const pointer = useRef('mouse')
  const { round, circuit, state } = tile
  const shown = open?.round === round && circuit !== undefined
  const close = () => setOpen(open?.round === round ? null : open)
  const show = () => setOpen({ round, locked: false })

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  }

  const onPointer = (e: PointerEvent, then: () => void) => {
    pointer.current = e.pointerType

    if (e.pointerType === 'mouse' && !open?.locked) then()
  }

  const onClick = () => {
    if (pointer.current === 'touch') setOpen(shown && open.locked ? null : { round, locked: true })
  }

  return (
    <li className={`tile is-${state}${shown ? ' is-open' : ''}`}>
      <button
        type="button"
        aria-label={`Round ${round} · ${circuit?.name ?? tile.code}${tile.status ? ` · ${tile.status}` : ''}`}
        aria-current={state === 'now' ? 'true' : undefined}
        aria-describedby={shown ? id : undefined}
        onPointerEnter={(e) => onPointer(e, show)}
        onPointerLeave={(e) => onPointer(e, close)}
        onPointerDown={(e) => {
          pointer.current = e.pointerType
        }}
        onFocus={show}
        onBlur={close}
        onKeyDown={onKeyDown}
        onClick={onClick}
      >
        <span className="mono n">{two(round)}</span>
        {circuit ? <img src={tileSrc(circuit.tile, shown ? 'hover' : state, theme)} alt="" width={208} height={192} /> : <span className="blank" />}
        <span className="mono code">{tile.code}</span>
        <span className="mono status">{tile.status}</span>
      </button>
      {shown ? <Card id={id} tile={tile} theme={theme} /> : null}
    </li>
  )
}

export function Calendar({ snapshot }: { snapshot: SeasonSnapshot }) {
  const now = useSecond()
  const theme = useTheme().theme ?? 'light'
  const [open, setOpen] = useState<Open | null>(null)
  const tiles = calendarTiles(snapshot, now)

  if (tiles.length === 0) return null

  const head = calendarHead(snapshot, now)
  const [first, ...rest] = head.headline.split('. ')

  return (
    <section className="calendar" aria-labelledby="calendar">
      <div className="mono head">
        <p>{head.label}</p>
        <p>{head.count}</p>
      </div>
      <h2 id="calendar" className="display">
        <span>{rest.length > 0 ? `${first}.` : first}</span>
        {rest.length > 0 ? <span>{rest.join('. ')}</span> : null}
      </h2>
      <ol className="tiles">
        {tiles.map((tile) => (
          <Tile key={tile.round} tile={tile} theme={theme} open={open} setOpen={setOpen} />
        ))}
      </ol>
      <p className="mono muted caption">Hover a round to see the circuit · tap on touch</p>
    </section>
  )
}
