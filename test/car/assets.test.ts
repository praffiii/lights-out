import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { rig } from '../../src/car/parts.ts'

const KB = 1024

const POSTERS = ['shadow-assembled', 'shadow-exploded', ...['exploded', 'exploded-phone', 'top', 'top-phone', 'side', 'side-corner'].flatMap((view) => [`${view}-light`, `${view}-dark`])]

it('ships every car poster within budget', async () => {
  for (const name of POSTERS) {
    const file = Bun.file(`public/car/${name}.webp`)

    expect(`${name} ${await file.exists()}`).toBe(`${name} true`)
    expect(file.size).toBeLessThan(200 * KB)
  }
})

const Gltf = Schema.Struct({
  nodes: Schema.Array(Schema.Struct({ name: Schema.optionalKey(Schema.String) })),
  meshes: Schema.Array(Schema.Struct({ primitives: Schema.Array(Schema.Struct({ indices: Schema.Number, attributes: Schema.Struct({ COLOR_0: Schema.optionalKey(Schema.Number), NORMAL: Schema.optionalKey(Schema.Number) }) })) })),
  accessors: Schema.Array(Schema.Struct({ count: Schema.Number })),
  images: Schema.optionalKey(Schema.Array(Schema.Struct({}))),
})

const gltf = async (path: string) => {
  const bytes = await Bun.file(path).arrayBuffer()
  const length = new DataView(bytes).getUint32(12, true)

  return { size: bytes.byteLength, json: Schema.decodeUnknownSync(Gltf)(JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, length)))) }
}

it('ships the car as one glb with every part, flap and baked light', async () => {
  const { size, json } = await gltf('public/car/car.glb')
  const names = new Set(json.nodes.map((n) => n.name))
  const primitives = json.meshes.flatMap((m) => m.primitives)
  const triangles = primitives.reduce((sum, p) => sum + (json.accessors[p.indices]?.count ?? 0) / 3, 0)

  expect(size).toBeLessThan(1.6 * 1024 * KB)
  expect(json.images ?? []).toEqual([])
  expect(rig.nodes.map((n) => n.name).filter((n) => !names.has(n))).toEqual([])
  expect(rig.flaps.every((f) => names.has(f.node))).toBe(true)
  expect(primitives.every((p) => p.attributes.COLOR_0 !== undefined && p.attributes.NORMAL === undefined)).toBe(true)
  expect(triangles).toBeLessThanOrEqual(110_000)
})
