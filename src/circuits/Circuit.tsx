import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { type RefObject, Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { gsap, REDUCED } from '#/motion/motion.ts'
import type { Theme } from '#/shell/theme.ts'

import { lapProfile } from './lap.ts'
import { allCircuits } from './registry.ts'
import { groundOf, isSector, mattify, PALETTE, screen, SECTORS } from './shaders.ts'
import { fitCrop, fitSpin } from './fit.ts'

const LAP_SECONDS = 14
const TRAIL = 8
const TRAIL_STEP = 0.6
const LIGHT_RADIUS = 5
const REST_ASPECT = 16 / 10
const SHIFT_X = -0.06
const SHIFT_Y = 0.07
const TAG_OFFSET = [-8, 8] as const

const meshopt = (loader: GLTFLoader) => void loader.setMeshoptDecoder(MeshoptDecoder)

export const modelUrl = (model: string) => `/circuits/${model}.glb`

export const preloadCircuit = (model: string) => useLoader.preload(GLTFLoader, modelUrl(model), meshopt)

export type Lap = {
  restart: number
  running: RefObject<boolean>
  tag: RefObject<HTMLElement | null>
  onLap: () => void
  onLapProgress: (t: number) => void
}

type Props = {
  model: string
  theme: Theme
  layout: 'wide' | 'narrow' | 'spin'
  fill: RefObject<number>
  pins: RefObject<HTMLDivElement | null>
  onReady: () => void
  yaw?: RefObject<number>
  lap?: Lap
}

const SECTOR_NAMES = ['S1', 'S2', 'S3'] as const

const NO_LAP = () => {}

const infoFor = (model: string) => {
  const info = allCircuits().find((c) => c.model === model)

  if (!info) throw new Error(`${model} is not in the circuit registry`)

  return info
}

function Scene({ model, theme, layout, fill, pins, onReady, yaw, lap }: Props) {
  const restart = lap?.restart ?? 0
  const running = lap?.running
  const tag = lap?.tag
  const lapped = lap !== undefined
  const onLap = lap?.onLap ?? NO_LAP
  const onLapProgress = lap?.onLapProgress ?? NO_LAP
  const gltf = useLoader(GLTFLoader, modelUrl(model), meshopt)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const advance = useThree((s) => s.advance)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const clock = useRef(0)
  const previousU = useRef(0)
  const stale = useRef(true)
  const callbacks = useRef({ onLap, onLapProgress, onReady })

  useLayoutEffect(() => {
    callbacks.current = { onLap, onLapProgress, onReady }
  }, [onLap, onLapProgress, onReady])

  useEffect(() => {
    clock.current = 0
    previousU.current = 0
    stale.current = true
  }, [restart])

  const { materials, ground, markers, rest, light, spin, inner } = useMemo(() => {
    const info = infoFor(model)
    const materials = mattify(gltf.scene, (name) => (isSector(name) ? SECTORS[name] : '#000000'))
    const track = new THREE.Box3()

    gltf.scene.updateMatrixWorld(true)
    gltf.scene.traverse((o) => {
      if (isSector(o.name)) track.expandByObject(o)
    })

    const extent = track.getSize(new THREE.Vector3())
    const ground = groundOf(gltf.scene, theme, Math.max(extent.x, extent.z))

    materials.delete('ground')
    const markers: THREE.Object3D[] = []

    gltf.scene.traverse((o) => {
      if (o.name.startsWith('turn-')) markers.push(o)
    })

    const source = gltf.cameras[0]

    if (!(source instanceof THREE.PerspectiveCamera)) throw new Error(`${model}.glb has no perspective camera`)

    const at = source.getWorldPosition(new THREE.Vector3())
    const forward = source.getWorldDirection(new THREE.Vector3())
    const centre = track.getCenter(new THREE.Vector3())
    const aim = at.clone().addScaledVector(forward, centre.clone().sub(at).dot(forward))

    const rest = {
      at,
      aim,
      fov: source.fov,
      far: source.far,
      crop: info.crop,
      line: info.line,
      lap: lapProfile(info.line, 1),
    }

    const geometry = new THREE.SphereGeometry(LIGHT_RADIUS, 16, 12)
    const head = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())

    const trail = Array.from({ length: TRAIL }, (_, i) => {
      const dot = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7 - 0.08 * i }))

      dot.scale.setScalar(0.55 - 0.05 * i)

      return dot
    })

    const group = new THREE.Group()

    group.add(head, ...trail)
    group.visible = false

    const spin = new THREE.Group()
    const inner = new THREE.Group()

    spin.position.copy(centre)
    inner.position.copy(centre).negate()

    const [c1, c2] = info.cuts
    const mids = [c1 / 2, (c1 + c2) / 2, (c2 + 1) / 2]

    for (const [i, name] of SECTOR_NAMES.entries()) {
      const target = mids[i] ?? 0
      const nearest = info.line.reduce((best, p) => (Math.abs(p.u - target) < Math.abs(best.u - target) ? p : best))
      const anchor = new THREE.Object3D()

      anchor.name = name
      anchor.position.set(nearest.x, nearest.y, nearest.z)
      markers.push(anchor)
    }

    return { materials, ground, markers, rest, light: { group, head, trail, geometry }, spin, inner }
  }, [gltf, model])

  useEffect(() => {
    light.group.visible = lapped && !REDUCED
  }, [light, lapped])

  useEffect(
    () => () => {
      light.geometry.dispose()

      for (const m of [light.head, ...light.trail]) if (m.material instanceof THREE.Material) m.material.dispose()
    },
    [light],
  )

  useLayoutEffect(() => {
    const t = PALETTE[theme]

    for (const [name, m] of materials) {
      if (isSector(name)) m.uniforms.uBase.value.set(t.unfilled)
      else m.uniforms.uColor.value.set(t.ink)
    }

    for (const m of [light.head, ...light.trail]) if (m.material instanceof THREE.MeshBasicMaterial) m.material.color.set(t.ink)

    ground.setTheme(theme)
    stale.current = true
  }, [theme, materials, ground, light])

  useEffect(() => {
    const pinEls = new Map<string, HTMLElement>()

    for (const el of pins.current?.querySelectorAll<HTMLElement>('[data-pin]') ?? []) pinEls.set(el.dataset.pin ?? '', el)

    const frame = () => {
      if (!(camera instanceof THREE.PerspectiveCamera)) return

      camera.fov = rest.fov
      camera.near = 10
      camera.far = rest.far

      if (layout === 'spin') {
        const fit = fitSpin(rest.crop, size.width / size.height)
        const fullW = fit.w * size.width
        const fullH = fit.h * size.height

        camera.aspect = REST_ASPECT
        camera.setViewOffset(fullW, fullH, fit.x * size.width + SHIFT_X * fullW, fit.y * size.height - SHIFT_Y * fullW, size.width, size.height)
      } else if (layout === 'wide') {
        const { k, x, y } = fitCrop(rest.crop)

        camera.aspect = size.width / size.height
        camera.setViewOffset(k * size.width, k * size.height, (k * SHIFT_X - x) * size.width, -(k * SHIFT_Y * size.width + y * size.height), size.width, size.height)
      } else {
        const [x0, y0, x1, y1] = rest.crop
        const fullH = size.height / (y1 - y0)
        const fullW = fullH * REST_ASPECT

        camera.aspect = REST_ASPECT
        camera.setViewOffset(fullW, fullH, ((x0 + x1) / 2 + SHIFT_X) * fullW - size.width / 2, ((y0 + y1) / 2) * fullH - SHIFT_Y * fullW - size.height / 2, size.width, size.height)
      }

      camera.updateProjectionMatrix()
      camera.position.copy(rest.at)
      camera.lookAt(rest.aim)
      camera.updateMatrixWorld()
    }

    const spot = new THREE.Vector3()
    const next = new THREE.Vector3()
    const { line } = rest
    const n = line.length

    const sample = (index: number, out: THREE.Vector3) => {
      const wrapped = ((index % n) + n) % n
      const i = Math.floor(wrapped)
      const a = line[i]
      const b = line[(i + 1) % n]

      if (!a || !b) return out.set(0, 0, 0)

      const f = wrapped - i

      return out.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f)
    }

    stale.current = true

    let first = true
    let compiled = false
    let lastFill = -1
    let lastYaw = Number.NaN

    void gl.compileAsync(scene, camera).then(() => {
      compiled = true
    })

    const tick = (time: number, dt: number) => {
      if (!compiled) return

      if (camera instanceof THREE.PerspectiveCamera && camera.aspect !== (layout === 'wide' ? size.width / size.height : REST_ASPECT)) stale.current = true

      const go = (running?.current ?? false) && !REDUCED
      const turned = (yaw?.current ?? 0) !== lastYaw
      const moved = fill.current !== lastFill || turned

      if (!go && !moved && !stale.current) return

      if (stale.current) frame()

      stale.current = false
      lastFill = fill.current
      lastYaw = yaw?.current ?? 0
      spin.rotation.y = lastYaw

      for (const [name, m] of materials) if (isSector(name)) m.uniforms.uTo.value = fill.current


      if (go) {
        clock.current += Math.min(dt / 1000, 0.1)

        const t = clock.current / LAP_SECONDS
        const u = rest.lap.uAt(t)

        if (u < previousU.current) callbacks.current.onLap()

        previousU.current = u
        callbacks.current.onLapProgress(t - Math.floor(t))
      }

      if (lapped && !REDUCED) {
        const index = rest.lap.uAt(clock.current / LAP_SECONDS) * n

        light.head.position.copy(sample(index, spot))

        for (const [i, m] of light.trail.entries()) m.position.copy(sample(index - TRAIL_STEP * (i + 1), next))

        const el = tag?.current
        const at = el && screen(light.head, camera, size.width, size.height)

        if (el) {
          el.style.visibility = at ? '' : 'hidden'

          if (at) el.style.transform = `translate(${at[0] + TAG_OFFSET[0]}px, ${at[1] + TAG_OFFSET[1]}px)`
        }
      }

      for (const o of markers) {
        const pin = pinEls.get(o.name)
        const at = pin && screen(o, camera, size.width, size.height)

        if (!pin) continue

        pin.style.visibility = at ? '' : 'hidden'

        if (at) pin.style.transform = `translate(${at[0]}px, ${at[1]}px)`
      }

      advance(time * 1000)

      if (first) {
        first = false
        callbacks.current.onReady()
      }
    }

    gsap.ticker.add(tick)

    return () => gsap.ticker.remove(tick)
  }, [materials, markers, rest, light, spin, camera, size, layout, advance, gl, scene, fill, running, pins, tag, yaw, lapped])

  return (
    <>
      <primitive object={spin}>
        <primitive object={inner}>
          <primitive object={gltf.scene} />
          <primitive object={light.group} />
          {markers
            .filter((o) => !o.name.startsWith('turn-'))
            .map((o) => (
              <primitive key={o.name} object={o} />
            ))}
        </primitive>
      </primitive>
    </>
  )
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
