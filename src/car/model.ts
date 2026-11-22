import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { meshopt } from '#/three/meshopt.ts'

export { clayMaterial, SECTOR_PURPLE, shadowMaterial } from '#/three/clay.ts'

export const CAR_URL = '/car/car.glb'

export const CLAY = {
  light: { body: '#D3D1CA', tyre: '#2E3035', rim: '#8A8D93', pu: '#9C9EA4' },
  dark: { body: '#5A5D64', tyre: '#232428', rim: '#7A7D84', pu: '#7A7D84' },
} as const

export type Clay = keyof (typeof CLAY)['light']

export const clayOf = (name: string): Clay => (name.endsWith('_tyre') ? 'tyre' : name.endsWith('_rim') ? 'rim' : name === 'powerUnit' ? 'pu' : 'body')

export const useCar = () => useLoader(GLTFLoader, CAR_URL, meshopt)

export const preloadCar = () => useLoader.preload(GLTFLoader, CAR_URL, meshopt)

export const SHADOWS = ['/car/shadow-assembled.webp', '/car/shadow-exploded.webp']
