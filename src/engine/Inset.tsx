import type { TurnLap } from '#/circuits/registry.ts'

import { insetPoint, type InsetPoint } from './inset.ts'

export const nextTurn = (turns: ReadonlyArray<TurnLap>, u: number): number => {
  const wrapped = u - Math.floor(u)
  const ahead = turns.find((turn) => turn.u > wrapped)

  return ahead?.turn ?? turns[0]?.turn ?? 1
}

type Props = {
  name: string
  src: string
  line: ReadonlyArray<InsetPoint>
  turns: ReadonlyArray<TurnLap>
  initialU: number
}

export function Inset({ name, src, line, turns, initialU }: Props) {
  const pos = insetPoint(line, initialU)
  const turn = nextTurn(turns, initialU)

  return (
    <div className="inset" data-theme="dark">
      <div className="inset-frame">
        <img src={src} alt={`${name} circuit map`} loading="lazy" />
        <span className="car-dot" data-inset-dot style={{ left: `${(pos.x * 100).toFixed(2)}%`, top: `${(pos.y * 100).toFixed(2)}%` }} aria-hidden />
      </div>
      <p className="mono inset-label" data-inset-label>{`${name} · T${turn} ahead`}</p>
    </div>
  )
}
