import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { SECTORS } from '#/circuits/shaders.ts'
import { meshopt } from '#/three/meshopt.ts'

export const CAR_URL = '/car/car.glb'

export const SECTOR_PURPLE = SECTORS.S1

const LIGHT_GAIN = 2

export const CLAY = {
  light: { body: '#D3D1CA', tyre: '#2E3035', rim: '#8A8D93', pu: '#9C9EA4' },
  dark: { body: '#5A5D64', tyre: '#232428', rim: '#7A7D84', pu: '#7A7D84' },
} as const

export type Clay = keyof (typeof CLAY)['light']

export const clayOf = (name: string): Clay => (name.endsWith('_tyre') ? 'tyre' : name.endsWith('_rim') ? 'rim' : name === 'powerUnit' ? 'pu' : 'body')

export const useCar = () => useLoader(GLTFLoader, CAR_URL, meshopt)

export const preloadCar = () => useLoader.preload(GLTFLoader, CAR_URL, meshopt)

const vertexShader = `
  varying vec2 vLight;
  void main() {
    vLight = color.rg;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`

const fragmentShader = `
  uniform vec3 uClay;
  uniform vec3 uTint;
  uniform float uMix;
  uniform float uLit;
  varying vec2 vLight;
  void main() {
    float light = mix(vLight.x, vLight.y, uMix) * ${LIGHT_GAIN.toFixed(1)};
    gl_FragColor = vec4(light * mix(uClay, uTint, uLit), 1.0);
    #include <colorspace_fragment>
  }`

export function clayMaterial(clay: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uClay: { value: new THREE.Color(clay) }, uTint: { value: new THREE.Color(SECTOR_PURPLE) }, uMix: { value: 0 }, uLit: { value: 0 } },
    vertexColors: true,
    vertexShader,
    fragmentShader,
  })
}
