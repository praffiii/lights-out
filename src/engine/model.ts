import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { meshopt } from '#/three/meshopt.ts'

export const ENGINE_URL = '/engine/engine.glb'

export const ENGINE_SHADOW = '/engine/shadow-band.webp'

export const ENGINE_CLAY = {
  light: { body: '#D6D4CD', carbon: '#8F9298', metal: '#A6A8AD', dark: '#4A4D53' },
  dark: { body: '#5E6168', carbon: '#3C3F45', metal: '#7E8188', dark: '#26282D' },
} as const

export type EngineTone = keyof (typeof ENGINE_CLAY)['light']

export const toneOf = (name: string): EngineTone =>
  name.endsWith('_carbon') ? 'carbon' : name.endsWith('_metal') ? 'metal' : name.endsWith('_dark') ? 'dark' : 'body'

export const useEngine = () => useLoader(GLTFLoader, ENGINE_URL, meshopt)

export const preloadEngine = () => useLoader.preload(GLTFLoader, ENGINE_URL, meshopt)
