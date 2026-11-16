import type { CSSProperties } from 'react'

import { Go } from '#/shell/Go.tsx'

import type { IndexCell } from './index-model.ts'
import SIZES from './sizes.json'

type Layout = keyof typeof SIZES

type Sheet = {
  w: number
  h: number
  km: number
  cells: Readonly<Record<string, { patch: ReadonlyArray<number>; label: ReadonlyArray<number> }>>
}

const SHEETS: Readonly<Record<Layout, Sheet>> = SIZES

type Vars = CSSProperties & Record<`--${string}`, number | string>

const LAYOUTS: ReadonlyArray<Layout> = ['desk', 'phone']

const pct = (v: number, of: number) => `${(v / of) * 100}%`

const two = (n: number) => String(n).padStart(2, '0')

const chipText = (cell: IndexCell, layout: Layout) => (layout === 'desk' ? `${two(cell.round)} · ${cell.label} · ${cell.lengthKm} km` : `${two(cell.round)} ${cell.label}`)

function Cell({ cell, layout }: { cell: IndexCell; layout: Layout }) {
  const { w, h, cells } = SHEETS[layout]
  const at = cells[cell.tile]?.label ?? [0, 0]
  const [x = 0, y = 0] = at
  const style: Vars = { left: pct(x, w), top: pct(y, h) }
  const arrow = cell.to ? ' →' : ''

  const body = cell.lit ? (
    `${chipText(cell, layout)}${arrow}`
  ) : (
    <>
      <b>{two(cell.round)}</b>
      {`${cell.label}${arrow}`}
    </>
  )

  const className = `mono cell${cell.lit ? ' chip' : ''}`

  return cell.to ? (
    <Go to={cell.to} className={className} style={style}>
      {body}
    </Go>
  ) : (
    <span className={className} style={style}>
      {body}
    </span>
  )
}

function Scale({ layout }: { layout: Layout }) {
  const { w, h, km, cells } = SHEETS[layout]
  const labels = Object.values(cells).map((c) => c.label)
  const firstY = labels[0]?.[1]
  const cols = labels.filter(([, y]) => y === firstY).length
  const slot = labels.length
  const x = labels[slot % cols]?.[0] ?? 0
  const y = labels[Math.floor(slot / cols) * cols]?.[1] ?? labels.at(-1)?.[1] ?? 0
  const style: Vars = { left: pct(x, w), top: pct(y, h), '--k': km / w }

  return (
    <span className="mono scale" style={style}>
      1 km
      <i aria-hidden />
    </span>
  )
}

export function SizesBand({ cells }: { cells: ReadonlyArray<IndexCell> }) {
  const lit = cells.find((cell) => cell.lit)

  return (
    <>
      <section className="band sizes" data-theme="dark" aria-labelledby="sizes">
        <div className="head">
          <p className="mono label">Same scale</p>
          <h2 id="sizes" className="display">
            <span className="hl">Side by</span>
            <span className="hl">side.</span>
          </h2>
          <p className="body">Every 2026 circuit, north up and drawn to one scale on a 1 km grid. A lap of Spa is twice as long as a lap of Monaco.</p>
          <p className="mono hint">Pick a track with → to open it</p>
        </div>
        {LAYOUTS.map((layout) => {
          const { w, h, cells: boxes } = SHEETS[layout]
          const patch = lit ? boxes[lit.tile]?.patch : undefined
          const [px = 0, py = 0, pw = 0, ph = 0] = patch ?? []

          return (
            <div key={layout} className={`stage ${layout}`} style={{ aspectRatio: `${w} / ${h}` }}>
              <img className="base" src={`/circuits/sizes/${layout}.webp`} alt="Every 2026 circuit, drawn to one scale on a 1 km grid" loading="lazy" />
              {lit && patch ? (
                <img
                  className="patch"
                  src={`/circuits/sizes/${layout}-${lit.tile}.webp`}
                  alt=""
                  loading="lazy"
                  style={{
                    left: pct(px, w),
                    top: pct(py, h),
                    width: pct(pw, w),
                    height: pct(ph, h),
                  }}
                />
              ) : null}
              {cells.map((cell) => (
                <Cell key={cell.id} cell={cell} layout={layout} />
              ))}
              <Scale layout={layout} />
            </div>
          )
        })}
      </section>
      <p className="mono muted sizes-note">
        Layouts: bacinger/f1-circuits (MIT), modelled in Blender · track width exaggerated so it shows · seen at an angle on a 1 km grid, so the bar holds left to right
      </p>
    </>
  )
}
