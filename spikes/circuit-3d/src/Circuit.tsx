import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { type RefObject, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { damp, mattify, screen, scrollProgress } from './shaders'
import { isSector, SECTORS, THEMES, type Theme } from './tokens'

const START_AZIMUTH = -0.26 // rad; the camera swings round to the poster's angle as you scroll
const START_LIFT = 0.28 // rad of extra elevation at the top of the page
const ease = (t: number) => 1 - (1 - t) ** 3

type Props = {
  theme: Theme
  pins: RefObject<HTMLDivElement | null>
  readout: RefObject<HTMLSpanElement | null>
  onReady: () => void
}

export function Circuit({ theme, pins, readout, onReady }: Props) {
  const gltf = useLoader(GLTFLoader, '/interlagos.glb')
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera)
  const size = useThree((s) => s.size)

  const { materials, markers, orbit } = useMemo(() => {
    const materials = mattify(gltf.scene, (name) => (isSector(name) ? SECTORS[name].color : '#000000'))
    const markers: THREE.Object3D[] = []
    gltf.scene.traverse((o) => {
      if (o.name.startsWith('turn-') || o.name.startsWith('label-')) markers.push(o)
    })
    // the camera Blender rendered the poster from: same distance, elevation and lens
    const source = gltf.cameras[0] as THREE.PerspectiveCamera
    gltf.scene.updateMatrixWorld(true)
    const at = source.getWorldPosition(new THREE.Vector3())
    const orbit = { distance: at.length(), elevation: Math.asin(at.y / at.length()), fov: source.fov, far: source.far }
    return { materials, markers, orbit }
  }, [gltf])

  useLayoutEffect(() => {
    const t = THEMES[theme]
    for (const [name, m] of materials) {
      if (isSector(name)) m.uniforms.uBase.value.set(t.unfilled)
      else m.uniforms.uColor.value.set(name === 'ground' ? t.bg : t.ink)
    }
  }, [theme, materials])

  useLayoutEffect(() => {
    camera.fov = orbit.fov
    camera.near = 10
    camera.far = orbit.far
    camera.updateProjectionMatrix()
  }, [camera, orbit])

  const state = useRef({ p: 0, ready: false })

  useFrame(({ pointer }, dt) => {
    const s = state.current
    s.p = damp(s.p, scrollProgress(), Math.min(dt, 0.1))
    const p = s.p

    const fill = Math.min(1, Math.max(0, (p - 0.04) / 0.86))
    for (const [name, m] of materials) if (isSector(name)) m.uniforms.uTo.value = fill

    const az = START_AZIMUTH * (1 - ease(p)) + pointer.x * 0.035
    const el = orbit.elevation + START_LIFT * (1 - ease(p)) + pointer.y * 0.02
    camera.position.set(
      orbit.distance * Math.cos(el) * Math.sin(az),
      orbit.distance * Math.sin(el),
      orbit.distance * Math.cos(el) * Math.cos(az),
    )
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()

    const box = pins.current
    if (box) {
      for (const o of markers) {
        const pin = box.querySelector<HTMLElement>(`[data-pin="${o.name}"]`)
        const at = pin && screen(o, camera, size.width, size.height)
        if (!pin || !at) continue
        pin.style.transform = `translate(${at[0]}px, ${at[1]}px)`
        const sector = o.name.slice('label-'.length)
        if (isSector(sector)) pin.style.opacity = fill > SECTORS[sector].from + 0.02 ? '1' : '0'
      }
    }
    if (readout.current) {
      const current = fill >= SECTORS.S3.from ? 'S3' : fill >= SECTORS.S2.from ? 'S2' : 'S1'
      readout.current.textContent = `${current} · lap ${Math.round(fill * 100)}%`
    }
    if (!s.ready) {
      s.ready = true
      onReady()
    }
  })

  return <primitive object={gltf.scene} />
}
