import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { type RefObject, Suspense, useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { gsap } from '#/motion/motion.ts'
import type { Theme } from '#/shell/theme.ts'

import { damp, isSector, mattify, PALETTE, screen, SECTORS } from './shaders.ts'

const START_AZIMUTH = -0.26
const START_LIFT = 0.1

const ease = (t: number) => 1 - (1 - t) ** 3

const meshopt = (loader: GLTFLoader) => void loader.setMeshoptDecoder(MeshoptDecoder)

export const modelUrl = (model: string) => `/circuits/${model}.glb`

export const preloadCircuit = (model: string) => useLoader.preload(GLTFLoader, modelUrl(model), meshopt)

type Props = {
  model: string
  theme: Theme
  progress: RefObject<number>
  live: RefObject<boolean>
  pins: RefObject<HTMLDivElement | null>
  onReady: () => void
}

function Scene({ model, theme, progress, live, pins, onReady }: Props) {
  const gltf = useLoader(GLTFLoader, modelUrl(model), meshopt)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const advance = useThree((s) => s.advance)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  const { materials, markers, orbit } = useMemo(() => {
    const materials = mattify(gltf.scene, (name) => (isSector(name) ? SECTORS[name] : '#000000'))
    const markers: THREE.Object3D[] = []

    gltf.scene.traverse((o) => {
      if (o.name.startsWith('turn-')) markers.push(o)
    })

    const source = gltf.cameras[0]

    if (!(source instanceof THREE.PerspectiveCamera)) throw new Error(`${model}.glb has no perspective camera`)

    gltf.scene.updateMatrixWorld(true)

    const at = source.getWorldPosition(new THREE.Vector3())

    return { materials, markers, orbit: { distance: at.length(), elevation: Math.asin(at.y / at.length()), fov: source.fov, far: source.far } }
  }, [gltf, model])

  useLayoutEffect(() => {
    const t = PALETTE[theme]

    for (const [name, m] of materials) {
      if (isSector(name)) m.uniforms.uBase.value.set(t.unfilled)
      else m.uniforms.uColor.value.set(name === 'ground' ? t.bg : t.ink)
    }
  }, [theme, materials])

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return

    camera.fov = orbit.fov
    camera.near = 10
    camera.far = orbit.far
    camera.updateProjectionMatrix()
  }, [camera, orbit])

  useEffect(() => {
    const pinEls = new Map<string, HTMLElement>()

    for (const el of pins.current?.querySelectorAll<HTMLElement>('[data-pin]') ?? []) pinEls.set(el.dataset.pin ?? '', el)

    let p = progress.current
    let first = true
    let compiled = false

    void gl.compileAsync(scene, camera).then(() => {
      compiled = true
    })

    const tick = (time: number, dt: number) => {
      if (!compiled || (!live.current && !first)) return

      p = damp(p, progress.current, Math.min(dt / 1000, 0.1))

      const fill = Math.min(1, Math.max(0, (p - 0.05) / 0.85))

      for (const [name, m] of materials) if (isSector(name)) m.uniforms.uTo.value = fill

      const az = START_AZIMUTH * (1 - ease(p))
      const el = orbit.elevation + START_LIFT * (1 - ease(p))

      camera.position.set(orbit.distance * Math.cos(el) * Math.sin(az), orbit.distance * Math.sin(el), orbit.distance * Math.cos(el) * Math.cos(az))
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld()

      for (const o of markers) {
        const pin = pinEls.get(o.name)
        const at = pin && screen(o, camera, size.width, size.height)

        if (pin && at) pin.style.transform = `translate(${at[0]}px, ${at[1]}px)`
      }

      advance(time * 1000)

      if (first) {
        first = false
        onReady()
      }
    }

    gsap.ticker.add(tick)

    return () => gsap.ticker.remove(tick)
  }, [materials, markers, orbit, camera, size, advance, gl, scene, progress, live, pins, onReady])

  return <primitive object={gltf.scene} />
}

export default function Circuit(props: Props) {
  return (
    <Canvas frameloop="never" flat dpr={[1, 2]} gl={{ antialias: true, alpha: true }} aria-hidden>
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  )
}
