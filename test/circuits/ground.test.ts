import { expect, it } from 'bun:test'
import * as THREE from 'three'

import { groundOf } from '../../src/circuits/shaders.ts'

it('gives a scene one contour ground however often it is prepared, so a theme change reaches the mesh', () => {
  const mesh = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial())
  const scene = new THREE.Group()

  mesh.name = 'ground'
  scene.add(mesh)

  const first = groundOf(scene, 'dark', 100)
  const second = groundOf(scene, 'dark', 100)

  expect(second).toBe(first)
  expect(mesh.material).toBe(first.material)

  first.setTheme('light')
  expect(first.material.uniforms.uGround?.value.getHexString()).toBe('efeee9')
})
