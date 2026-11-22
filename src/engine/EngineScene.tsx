import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { Theme } from '#/shell/theme.ts'
import { clayMaterial, shadowMaterial } from '#/three/clay.ts'

import { ENGINE_CLAY, ENGINE_SHADOW, type EngineTone, toneOf, useEngine } from './model.ts'
import { PART_IDS, type PartId } from './phase.ts'
import { rig } from './rig.ts'

const HALF_SENSOR = 18
const TURN = Math.PI / 6
const TAU = 0.25
const MAX_STEP = 0.1
const SCREEN_FADE = 0.14

const PART_SET = new Set<string>(PART_IDS)

const partOf = (name: string): PartId => {
  const head = name.split('_')[0] ?? ''

  return PART_SET.has(head) ? (PART_IDS.find((id) => id === head) ?? 'v6') : 'v6'
}

type Props = {
  band: Theme
  progress: RefObject<number>
  lit: RefObject<PartId>
  awake: RefObject<boolean>
  redraw: RefObject<() => void>
  onReady: () => void
}

type Built = {
  pivot: THREE.Group
  axis: THREE.Vector3
  ground: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  meshes: Array<{ material: THREE.ShaderMaterial; part: PartId; tone: EngineTone }>
}

function build(scene: THREE.Group, shadow: THREE.Texture, initialLit: PartId): Built {
  const root = scene.clone(true)
  const centre = new THREE.Vector3(...rig.band.target)
  const inner = new THREE.Group()
  const pivot = new THREE.Group()
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(...rig.shadow.size).rotateX(-Math.PI / 2), shadowMaterial(shadow, shadow, SCREEN_FADE))
  const meshes: Built['meshes'] = []

  inner.position.copy(centre).negate()
  ground.position.set(...rig.shadow.centre)
  ground.renderOrder = -1
  inner.add(root, ground)
  pivot.position.copy(centre)
  pivot.add(inner)

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return

    const part = partOf(o.name)
    const tone = toneOf(o.name)
    const material = clayMaterial(ENGINE_CLAY.light[tone])

    if (material.uniforms.uLit && part === initialLit && tone !== 'dark') material.uniforms.uLit.value = 1

    o.material = material
    meshes.push({ material, part, tone })
  })

  return { pivot, axis: new THREE.Vector3(...rig.turn).normalize(), ground, meshes }
}

function Engine({ band, progress, lit, awake, redraw, onReady }: Props) {
  const gltf = useEngine()
  const shadow = useLoader(THREE.TextureLoader, ENGINE_SHADOW)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const initialLit = useRef(lit.current)
  const built = useMemo(() => build(gltf.scene, shadow, initialLit.current), [gltf, shadow])
  const glow = useRef<Map<PartId, number>>(new Map(PART_IDS.map((id) => [id, id === initialLit.current ? 1 : 0])))
  const drawn = useRef(false)

  useLayoutEffect(() => {
    for (const m of built.meshes) m.material.uniforms.uClay?.value.set(ENGINE_CLAY[band][m.tone])
    invalidate()
  }, [built, band, invalidate])

  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height)

    camera.position.set(...rig.band.position)
    camera.lookAt(...rig.band.target)
    camera.updateMatrixWorld()

    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = THREE.MathUtils.radToDeg(2 * Math.atan(HALF_SENSOR / rig.lens / aspect))

      if (Math.abs(camera.fov - fov) > 1e-3 || camera.aspect !== aspect) {
        camera.fov = fov
        camera.aspect = aspect
        camera.updateProjectionMatrix()
      }
    }

    invalidate()
  }, [camera, size, invalidate])

  useLayoutEffect(() => {
    redraw.current = () => {
      if (!document.hidden && awake.current) invalidate()
    }

    return () => {
      redraw.current = () => {}
    }
  }, [redraw, awake, invalidate])

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && awake.current) invalidate()
    }

    document.addEventListener('visibilitychange', onVisible)

    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [awake, invalidate])

  useLayoutEffect(
    () => () => {
      built.meshes.forEach((m) => m.material.dispose())
      built.ground.geometry.dispose()
      built.ground.material.dispose()
    },
    [built],
  )

  useFrame((_, dt) => {
    const active = lit.current
    const step = 1 - Math.exp(-Math.min(dt, MAX_STEP) / TAU)
    let moving = false

    for (const id of PART_IDS) {
      const target = id === active ? 1 : 0
      const cur = glow.current.get(id) ?? 0
      const next = Math.abs(target - cur) < 0.002 ? target : cur + (target - cur) * step

      glow.current.set(id, next)

      if (next !== target) moving = true
    }

    for (const m of built.meshes) {
      if (m.material.uniforms.uLit) m.material.uniforms.uLit.value = m.tone === 'dark' ? 0 : (glow.current.get(m.part) ?? 0)
    }

    built.pivot.quaternion.setFromAxisAngle(built.axis, TURN * progress.current)

    if (moving && awake.current && !document.hidden) invalidate()

    if (!drawn.current) {
      drawn.current = true
      requestAnimationFrame(onReady)
    }
  })

  return <primitive object={built.pivot} />
}

export default function EngineScene(props: Props) {
  return (
    <Canvas frameloop="demand" flat dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ near: 0.1, far: 50 }} aria-hidden>
      <Engine {...props} />
    </Canvas>
  )
}
