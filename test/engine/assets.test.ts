import { expect, it } from 'bun:test'
import { Schema } from 'effect'
import sharp from 'sharp'

import { PART_IDS } from '../../src/engine/phase.ts'

const KB = 1024

const STILLS = ['exploded-light', 'exploded-dark', 'band-light', 'band-dark'] as const

it('ships every engine still under 200 KB', async () => {
  for (const name of STILLS) {
    const file = Bun.file(`public/engine/${name}.webp`)

    expect(`${name} ${await file.exists()}`).toBe(`${name} true`)
    expect(file.size).toBeLessThan(200 * KB)
  }
})

it('fades band-light cleanly into paper (#F4F3EF) at the corners', async () => {
  const { data, info } = await sharp('public/engine/band-light.webp').removeAlpha().raw().toBuffer({ resolveWithObject: true })

  const at = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels

    return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0] as const
  }

  for (const [r, g, b] of [at(0, 0), at(info.width - 1, 0), at(0, info.height - 1), at(info.width - 1, info.height - 1)]) {
    expect(Math.abs(r - 0xf4)).toBeLessThanOrEqual(2)
    expect(Math.abs(g - 0xf3)).toBeLessThanOrEqual(2)
    expect(Math.abs(b - 0xef)).toBeLessThanOrEqual(2)
  }
})

const Gltf = Schema.Struct({
  nodes: Schema.Array(Schema.Struct({ name: Schema.optionalKey(Schema.String), mesh: Schema.optionalKey(Schema.Number) })),
  meshes: Schema.Array(
    Schema.Struct({
      name: Schema.optionalKey(Schema.String),
      primitives: Schema.Array(Schema.Struct({ indices: Schema.Number, attributes: Schema.Struct({ COLOR_0: Schema.optionalKey(Schema.Number), NORMAL: Schema.optionalKey(Schema.Number) }) })),
    }),
  ),
  images: Schema.optionalKey(Schema.Array(Schema.Struct({}))),
})

const TONES = new Set(['body', 'carbon', 'metal', 'dark'])

it('ships the power unit as one glb within budget with baked light and all five part nodes', async () => {
  const file = Bun.file('public/engine/engine.glb')

  expect(await file.exists()).toBe(true)
  expect(file.size).toBeLessThanOrEqual(400 * KB)

  const bytes = await file.arrayBuffer()
  const length = new DataView(bytes).getUint32(12, true)
  const json = Schema.decodeUnknownSync(Gltf)(JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, length))))
  const nodeNames = new Set(json.nodes.map((n) => n.name))
  const primitives = json.meshes.flatMap((m) => m.primitives)
  const meshNodes = json.nodes.filter((n) => n.mesh !== undefined)

  expect(json.images ?? []).toEqual([])
  expect(primitives.every((p) => p.attributes.COLOR_0 !== undefined && p.attributes.NORMAL === undefined)).toBe(true)

  for (const id of PART_IDS) expect(nodeNames.has(`part:${id}`)).toBe(true)

  expect(meshNodes.length).toBeGreaterThan(0)
  expect(meshNodes.every((n) => TONES.has((n.name ?? '').split('_').at(-1) ?? ''))).toBe(true)
})
