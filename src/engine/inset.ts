import { Schema } from 'effect'

import ae2009 from '#/circuits/insets/ae-2009.json'
import au1953 from '#/circuits/insets/au-1953.json'
import br1940 from '#/circuits/insets/br-1940.json'
import it1922 from '#/circuits/insets/it-1922.json'
import qa2004 from '#/circuits/insets/qa-2004.json'
import us2022 from '#/circuits/insets/us-2022.json'
import us2023 from '#/circuits/insets/us-2023.json'
import type { ModelledId } from '#/circuits/modelled.ts'

const InsetFile = Schema.Struct({
  line: Schema.Array(Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])),
})

export type InsetPoint = readonly [number, number, number]

export type Inset = { src: string; line: ReadonlyArray<InsetPoint> }

const decode = Schema.decodeUnknownSync(InsetFile)

const load = (model: string, line: ReadonlyArray<InsetPoint>): Inset => ({
  src: `/circuits/${model}-inset.webp`,
  line,
})

export const INSETS: Record<ModelledId, Inset> = {
  interlagos: load('br-1940', decode(br1940).line),
  vegas: load('us-2023', decode(us2023).line),
  losail: load('qa-2004', decode(qa2004).line),
  yas_marina: load('ae-2009', decode(ae2009).line),
  albert_park: load('au-1953', decode(au1953).line),
  miami: load('us-2022', decode(us2022).line),
  monza: load('it-1922', decode(it1922).line),
}

export const insetPoint = (line: ReadonlyArray<InsetPoint>, u: number) => {
  const n = line.length
  const first = line[0]

  if (n === 0 || !first) return { x: 0, y: 0 }

  if (n === 1) return { x: first[1], y: first[2] }

  const target = u - Math.floor(u)
  let lo = 0
  let hi = n

  while (lo < hi) {
    const mid = (lo + hi) >> 1
    const p = line[mid]

    if (p && p[0] <= target) lo = mid + 1
    else hi = mid
  }

  const i = lo === 0 ? n - 1 : lo - 1
  const j = (i + 1) % n
  const a = line[i] ?? first
  const b = line[j] ?? first
  const ua = a[0]
  const ub = j === 0 ? b[0] + 1 : b[0]
  const t = j === 0 && target < ua ? target + 1 : target
  const span = ub - ua
  const f = span === 0 ? 0 : Math.min(1, Math.max(0, (t - ua) / span))

  return { x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f }
}
