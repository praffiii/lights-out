import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export const meshopt = (loader: GLTFLoader) => void loader.setMeshoptDecoder(MeshoptDecoder)
