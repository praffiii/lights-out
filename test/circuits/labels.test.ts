import { expect, it } from 'bun:test'
import * as THREE from 'three'

import { hideLabels } from '../../src/circuits/labels.ts'

it('hides only the sector labels and shows them again', () => {
  const scene = new THREE.Group()

  for (const name of ['S1-label', 'S1-label-halo', 'turn-1', 'road']) scene.add(Object.assign(new THREE.Object3D(), { name }))

  const visible = () => scene.children.map((o) => [o.name, o.visible])
  const restore = hideLabels(scene)

  expect(visible()).toEqual([
    ['S1-label', false],
    ['S1-label-halo', false],
    ['turn-1', true],
    ['road', true],
  ])
  restore()
  expect(visible().every(([, on]) => on)).toBe(true)
})
