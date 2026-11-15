import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { type RefObject, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { Theme } from '#/shell/theme.ts'

import { CLAY, clayMaterial, clayOf, SHADOWS, shadowMaterial, useCar } from './model.ts'
import { type Framing, PARTS, rig, type Vec } from './parts.ts'
import { glowAt, smooth, stageAt } from './stage.ts'

const SPIN = 0.18

const MAX_STEP = 0.1

const TURN = Math.PI * 2

const PHONE_PULL = 17 / 19

const FOCUS = 0.35

const LOW = -0.45

const HALF_SENSOR = 18

const PART_INDEX = new Map<string, number>(PARTS.map((p, i) => [p.id, i]))

const ANCHORS = rig.parts.map((p) => {
  const lead = rig.nodes.find((n) => n.part === p.id && !n.name.includes('_R') && !n.name.includes('cover'))

  return { at: new THREE.Vector3(...p.anchor), offset: new THREE.Vector3(...(lead?.offset ?? [0, 0, 0])) }
})

type Props = {
  band: Theme
  phone: boolean
  time: RefObject<number>
  awake: RefObject<boolean>
  redraw: RefObject<() => void>
  tags: RefObject<HTMLDivElement | null>
  onReady: () => void
}

type Built = {
  pivot: THREE.Group
  ground: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  nodes: Array<{ node: THREE.Object3D; base: THREE.Vector3; offset: THREE.Vector3; hidden: boolean }>
  meshes: Array<{ material: THREE.ShaderMaterial; part: number; clay: keyof (typeof CLAY)['light'] }>
}

const v3 = (v: Vec) => new THREE.Vector3(...v)

function build(scene: THREE.Group, shadows: ReadonlyArray<THREE.Texture>): Built {
  const root = scene.clone(true)
  const [assembled, exploded] = shadows
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(...rig.shadow.size).rotateX(-Math.PI / 2), shadowMaterial(assembled ?? new THREE.Texture(), exploded ?? new THREE.Texture()))
  const centre = v3(rig.assembled.target)
  const inner = new THREE.Group()
  const pivot = new THREE.Group()
  const parts = new Map(rig.nodes.map((n) => [n.name, n.part]))
  const meshes: Built['meshes'] = []

  inner.position.copy(centre).negate()
  ground.position.set(...rig.shadow.centre)
  ground.renderOrder = -1
  inner.add(root, ground)
  pivot.position.copy(centre)
  pivot.add(inner)

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return

    const clay = clayOf(o.name)
    const material = clayMaterial(CLAY.light[clay])

    o.material = material
    meshes.push({ material, part: PART_INDEX.get(parts.get(o.name.replace(/_mesh$/, '')) ?? '') ?? -1, clay })
  })

  const nodes = rig.nodes.flatMap((n) => {
    const node = root.getObjectByName(n.name)

    return node ? [{ node, base: node.position.clone(), offset: v3(n.offset), hidden: rig.hidden.includes(n.part) }] : []
  })

  return { pivot, ground, nodes, meshes }
}

const framing = (i: number | null): Framing => (i === null ? rig.assembled : (rig.parts[i]?.camera ?? rig.assembled))

const toward = (v: Vec, to: Vec, out: THREE.Vector3) => out.set(...v).lerp(point.set(...to), FOCUS)

const eye = new THREE.Vector3()
const eyeTo = new THREE.Vector3()
const aimTo = new THREE.Vector3()
const look = new THREE.Vector3()
const point = new THREE.Vector3()

function aim(camera: THREE.Camera, t: number, phone: boolean, aspect: number) {
  const s = stageAt(t)
  const a = framing(s.from)
  const b = framing(s.to)
  const k = smooth(s.blend)

  const home = rig.assembled

  toward(home.target, a.target, look)
  toward(home.position, a.position, eye)
  toward(home.target, b.target, aimTo)
  toward(home.position, b.position, eyeTo)
  look.lerp(aimTo, k)
  eye.lerp(eyeTo, k)

  if (phone) eye.sub(look).multiplyScalar(PHONE_PULL).add(look)

  camera.position.copy(eye)
  camera.lookAt(look)

  if (camera instanceof THREE.PerspectiveCamera) {
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(HALF_SENSOR / rig.lens / aspect))

    if (Math.abs(camera.fov - fov) > 1e-3 || camera.aspect !== aspect) {
      camera.fov = fov
      camera.aspect = aspect
      camera.updateProjectionMatrix()
    }
  }
}

function pose(built: Built, t: number, idle: number) {
  const { explode } = stageAt(t)

  for (const n of built.nodes) {
    n.node.position.copy(n.base).addScaledVector(n.offset, explode)
    n.node.visible = !(n.hidden && explode > 0.5)
  }

  for (const m of built.meshes) {
    const uniforms = m.material.uniforms

    if (uniforms.uMix) uniforms.uMix.value = explode

    if (uniforms.uLit) uniforms.uLit.value = m.part < 0 ? 0 : glowAt(t, m.part)
  }

  built.ground.position.y = rig.shadow.centre[1] + rig.shadow.drop * explode

  if (built.ground.material.uniforms.uMix) built.ground.material.uniforms.uMix.value = explode

  built.pivot.rotation.y = (((idle + Math.PI) % TURN) - Math.PI) * (1 - explode)
}

function project(box: HTMLDivElement | null, camera: THREE.Camera, t: number) {
  if (!box) return

  const { explode, lit } = stageAt(t)
  const tags = box.querySelectorAll<HTMLElement>('[data-tag]')
  const chip = box.querySelector<HTMLElement>('.chip')

  box.style.opacity = smooth((explode - 0.6) / 0.4).toFixed(3)

  for (const [i, a] of ANCHORS.entries()) {
    point.copy(a.at).addScaledVector(a.offset, explode - 1).project(camera)

    const left = `${((point.x + 1) * 50).toFixed(2)}%`
    const top = `${((1 - point.y) * 50).toFixed(2)}%`
    const tag = tags[i]

    if (tag) {
      tag.style.left = left
      tag.style.top = top
    }

    if (chip && i === lit) {
      chip.style.left = left
      chip.style.top = top
      chip.toggleAttribute('data-up', point.y < LOW)
    }
  }
}

function Car({ band, phone, time, awake, redraw, tags, onReady }: Props) {
  const gltf = useCar()
  const invalidate = useThree((s) => s.invalidate)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const shadows = useLoader(THREE.TextureLoader, SHADOWS)
  const built = useMemo(() => build(gltf.scene, shadows), [gltf, shadows])
  const idle = useRef(0)
  const drawn = useRef(false)

  useLayoutEffect(() => {
    for (const m of built.meshes) m.material.uniforms.uClay?.value.set(CLAY[band][m.clay])
    invalidate()
  }, [built, band, invalidate])

  useLayoutEffect(() => {
    redraw.current = () => invalidate()

    return () => {
      redraw.current = () => {}
    }
  }, [redraw, invalidate])

  useLayoutEffect(
    () => () => {
      built.meshes.forEach((m) => m.material.dispose())
      built.ground.geometry.dispose()
      built.ground.material.dispose()
    },
    [built],
  )

  useFrame((_, dt) => {
    const t = time.current

    if (t === 0 && awake.current) {
      idle.current += Math.min(dt, MAX_STEP) * SPIN
      invalidate()
    }

    pose(built, t, idle.current)
    aim(camera, t, phone, size.width / Math.max(1, size.height))
    project(tags.current, camera, t)

    if (!drawn.current) {
      drawn.current = true
      requestAnimationFrame(onReady)
    }
  })

  return <primitive object={built.pivot} />
}

export default function PartsScene(props: Props) {
  return (
    <Canvas frameloop="demand" flat dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ near: 0.3, far: 80 }} aria-hidden>
      <Car {...props} />
    </Canvas>
  )
}
