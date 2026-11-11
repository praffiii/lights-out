import { expect, it } from 'bun:test'
import * as THREE from 'three'

import { broadcast } from '../../src/circuits/shaders.ts'

const strip = (name: string, from: number, to: number) => {
  const geometry = new THREE.PlaneGeometry()

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([from, 0, to, 0, from, 1, to, 1], 2))

  const mesh = new THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>(geometry, new THREE.MeshBasicMaterial())

  mesh.name = name

  return mesh
}

const circuit = () => {
  const group = new THREE.Group()

  group.add(strip('ground', 0, 1), strip('streets-major', 0, 1), strip('blocks', 0, 1), strip('S1', 0, 0.3), strip('S1-halo', 0, 0.3), strip('S1-label', 0, 1), strip('S1-label-halo', 0, 1))

  return group
}

const shader = (group: THREE.Object3D, name: string) => {
  const o = group.getObjectByName(name)

  if (!(o instanceof THREE.Mesh) || !(o.material instanceof THREE.ShaderMaterial)) throw new Error(`${name} has no shader material`)

  return o.material
}

it('paints the ground with the baked map', () => {
  const group = circuit()
  const map = new THREE.Texture()

  broadcast(group, map, 100)

  expect(shader(group, 'ground').uniforms.uMap?.value).toBe(map)
})

it('draws the streets as sharp lines that fade and haze with the map', () => {
  const group = circuit()

  broadcast(group, new THREE.Texture(), 100)

  const ground = shader(group, 'ground')
  const street = shader(group, 'streets-major')

  expect(street.uniforms.uMap).toBeUndefined()
  expect(street.uniforms.uColor?.value.getHexString()).toBe(new THREE.Color('#22304C').getHexString())
  expect(street.uniforms.uGround?.value).toEqual(ground.uniforms.uGround?.value)
  expect(street.uniforms.uSpan?.value).toBe(100)
})

it('fills a sector, its halo and its flat name from one value', () => {
  const group = circuit()
  const { fills } = broadcast(group, new THREE.Texture(), 100)
  const fill = fills[0]

  if (!fill) throw new Error('S1 has a fill')

  fill.uniforms.uTo.value = 0.2

  for (const name of ['S1', 'S1-halo', 'S1-label', 'S1-label-halo']) expect(shader(group, name).uniforms.uTo?.value).toBe(0.2)
})

it('adds the halos as light over the map', () => {
  const group = circuit()

  broadcast(group, new THREE.Texture(), 100)

  for (const name of ['S1-halo', 'S1-label-halo']) {
    const m = shader(group, name)

    expect([m.transparent, m.depthWrite, m.blending]).toEqual([true, false, THREE.AdditiveBlending])
  }
})

it('keeps the same materials when a scene is prepared twice', () => {
  const group = circuit()
  const map = new THREE.Texture()

  broadcast(group, map, 100)

  const first = ['ground', 'S1', 'S1-label', 'blocks'].map((name) => shader(group, name))

  broadcast(group, map, 100)

  for (const [i, name] of ['ground', 'S1', 'S1-label', 'blocks'].entries()) expect(shader(group, name)).toBe(first[i])
})
