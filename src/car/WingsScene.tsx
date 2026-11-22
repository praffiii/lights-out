import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { type RefObject, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { Theme } from '#/shell/theme.ts'
import { clayMaterial, shadowMaterial } from '#/three/clay.ts'

import { CLAY, clayOf, SHADOWS, useCar } from './model.ts'
import { rig } from './parts.ts'

const HIDDEN = new Set(['rearWing_endplate'])

type Props = {
  theme: Theme
  open: RefObject<number>
  redraw: RefObject<() => void>
  onReady: () => void
}

type Flap = { node: THREE.Object3D; base: THREE.Quaternion; axis: THREE.Vector3; angle: number }

type Built = {
  root: THREE.Group
  flaps: Array<Flap>
  meshes: Array<{ material: THREE.ShaderMaterial; clay: keyof (typeof CLAY)['light'] }>
  ground: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
}

const turn = new THREE.Quaternion()

function build(scene: THREE.Group, shadow: THREE.Texture): Built {
  const root = scene.clone(true)
  const hinges = rig.flaps.map((f) => f.node)
  const meshes: Built['meshes'] = []
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(...rig.shadow.size).rotateX(-Math.PI / 2), shadowMaterial(shadow, shadow, 0))

  root.traverse((o) => {
    if (HIDDEN.has(o.name)) o.visible = false

    if (!(o instanceof THREE.Mesh)) return

    const clay = clayOf(o.name)
    const material = clayMaterial(CLAY.light[clay])

    if (material.uniforms.uLit && hinges.some((h) => o.name.startsWith(h))) material.uniforms.uLit.value = 1

    o.material = material
    meshes.push({ material, clay })
  })

  const flaps = rig.flaps.flatMap((f) => {
    const node = root.getObjectByName(f.node)

    return node ? [{ node, base: node.quaternion.clone(), axis: new THREE.Vector3(...f.axis).normalize(), angle: f.angle }] : []
  })

  ground.position.set(...rig.shadow.centre)
  ground.renderOrder = -1
  root.add(ground)

  return { root, flaps, meshes, ground }
}

function Car({ theme, open, redraw, onReady }: Props) {
  const gltf = useCar()
  const [shadow] = useLoader(THREE.TextureLoader, SHADOWS)
  const built = useMemo(() => build(gltf.scene, shadow ?? new THREE.Texture()), [gltf, shadow])
  const invalidate = useThree((s) => s.invalidate)
  const set = useThree((s) => s.set)
  const size = useThree((s) => s.size)
  const camera = useMemo(() => Object.assign(new THREE.OrthographicCamera(), { manual: true }), [])
  const drawn = useRef(false)

  useLayoutEffect(() => {
    const half = rig.side.scale / 2
    const aspect = size.width / Math.max(1, size.height)

    camera.left = -half
    camera.right = half
    camera.top = half / aspect
    camera.bottom = -half / aspect
    camera.near = 0.1
    camera.far = 60
    camera.position.set(...rig.side.position)
    camera.lookAt(...rig.side.target)
    camera.updateProjectionMatrix()
    set({ camera })
    invalidate()
  }, [camera, size, set, invalidate])

  useLayoutEffect(() => {
    for (const m of built.meshes) m.material.uniforms.uClay?.value.set(CLAY[theme][m.clay])
    invalidate()
  }, [built, theme, invalidate])

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

  useFrame(() => {
    for (const f of built.flaps) f.node.quaternion.copy(f.base).multiply(turn.setFromAxisAngle(f.axis, f.angle * open.current))

    if (!drawn.current) {
      drawn.current = true
      requestAnimationFrame(onReady)
    }
  })

  return <primitive object={built.root} />
}

export default function WingsScene(props: Props) {
  return (
    <Canvas frameloop="demand" flat dpr={[1, 2]} gl={{ antialias: true, alpha: true }} aria-hidden>
      <Car {...props} />
    </Canvas>
  )
}
