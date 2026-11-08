import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { drive, onFrame } from './drive'

/** Length of the straight the scroll covers, in metres. */
const LENGTH = 1000
const SPAN = LENGTH + 360
const POLE_GAP = 30
const KERB = 1.6

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  draw(canvas.getContext('2d')!, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const glow = canvasTexture(128, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.12, 'rgba(255,255,255,0.5)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, s, s)
})

const asphalt = canvasTexture(256, (g, s) => {
  g.fillStyle = '#16171b'
  g.fillRect(0, 0, s, s)
  for (let i = 0; i < 6000; i++) {
    const light = Math.random() > 0.5
    g.fillStyle = light ? `rgba(255,255,255,${(Math.random() * 0.06).toFixed(3)})` : `rgba(0,0,0,${(Math.random() * 0.3).toFixed(3)})`
    g.fillRect(Math.random() * s, Math.random() * s, 1, 1)
  }
})
asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping
asphalt.repeat.set(3, SPAN / 4)
asphalt.anisotropy = 8

const horizon = canvasTexture(256, (g, s) => {
  const r = g.createLinearGradient(0, 0, 0, s)
  r.addColorStop(0, 'rgba(70,72,84,0)')
  r.addColorStop(0.55, 'rgba(78,80,92,0.5)')
  r.addColorStop(1, 'rgba(70,72,84,0)')
  g.fillStyle = r
  g.fillRect(0, 0, s, s)
})

/** Renders one frame per tick of the shared clock, so the scene never runs its own loop. */
function Driver({ onFirstFrame }: { onFirstFrame: () => void }) {
  const advance = useThree((s) => s.advance)
  useEffect(() => {
    let first = true
    return onFrame(({ time }) => {
      advance(time)
      if (first) {
        first = false
        onFirstFrame()
      }
    })
  }, [advance, onFirstFrame])
  return null
}

function Rig() {
  const sky = useRef<THREE.Mesh>(null!)
  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera
    const z = drive.reduced ? -4 : -drive.progress * LENGTH
    const shake = Math.sin(state.clock.elapsedTime * 38) * 0.012 * drive.speed
    camera.position.set(0, 1.05 + shake, z)
    camera.fov = 56 + drive.speed * 18
    camera.updateProjectionMatrix()
    camera.lookAt(0, 1, z - 30)
    sky.current.position.z = z - 300
  })
  return (
    <mesh ref={sky} position={[0, 6, -300]}>
      <planeGeometry args={[900, 60]} />
      <meshBasicMaterial map={horizon} transparent depthWrite={false} fog={false} />
    </mesh>
  )
}

function useInstances(ref: RefObject<THREE.InstancedMesh | null>, place: (o: THREE.Object3D, i: number) => string | void) {
  useLayoutEffect(() => {
    const mesh = ref.current!
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    for (let i = 0; i < mesh.count; i++) {
      o.position.set(0, 0, 0)
      o.rotation.set(0, 0, 0)
      o.scale.set(1, 1, 1)
      const color = place(o, i)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      if (color) mesh.setColorAt(i, c.set(color))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [ref, place])
}

const kerbCount = Math.floor(SPAN / KERB)
const placeKerb = (o: THREE.Object3D, i: number) => {
  const side = i < kerbCount ? -1 : 1
  const k = i % kerbCount
  o.position.set(side * 6.45, 0.03, -k * KERB + 20)
  return k % 2 ? '#2a2c31' : '#e9e8e2'
}

const poleCount = Math.ceil(SPAN / POLE_GAP)
const poleZ = (i: number) => -(i % poleCount) * POLE_GAP - 8
const poleSide = (i: number) => (i < poleCount ? -1 : 1)
const placePole = (o: THREE.Object3D, i: number) => void o.position.set(poleSide(i) * 11.5, 4.5, poleZ(i))
const placeHead = (o: THREE.Object3D, i: number) => {
  o.position.set(poleSide(i) * 10.9, 9, poleZ(i))
  o.rotation.z = poleSide(i) * 0.35
}
const placePool = (o: THREE.Object3D, i: number) => {
  o.position.set(poleSide(i) * 3.5, 0.02, poleZ(i))
  o.rotation.x = -Math.PI / 2
  o.scale.set(16, 22, 1)
}

function Track() {
  const kerbs = useRef<THREE.InstancedMesh>(null)
  const poles = useRef<THREE.InstancedMesh>(null)
  const heads = useRef<THREE.InstancedMesh>(null)
  const pools = useRef<THREE.InstancedMesh>(null)
  useInstances(kerbs, placeKerb)
  useInstances(poles, placePole)
  useInstances(heads, placeHead)
  useInstances(pools, placePool)
  const lamps = useMemo(() => Array.from({ length: poleCount * 2 }, (_, i) => [poleSide(i) * 10.4, 8.7, poleZ(i)] as const), [])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -SPAN / 2 + 20]}>
        <planeGeometry args={[12, SPAN]} />
        <meshBasicMaterial map={asphalt} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh rotation-x={-Math.PI / 2} position={[side * 5.8, 0.011, -SPAN / 2 + 20]}>
            <planeGeometry args={[0.14, SPAN]} />
            <meshBasicMaterial color="#d9d8d2" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[side * 8.2, -0.01, -SPAN / 2 + 20]}>
            <planeGeometry args={[3.5, SPAN]} />
            <meshBasicMaterial color="#121315" />
          </mesh>
          <mesh rotation-y={-side * Math.PI / 2} position={[side * 9.9, 0.55, -SPAN / 2 + 20]}>
            <planeGeometry args={[SPAN, 1.1]} />
            <meshBasicMaterial color="#1d1e23" />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={kerbs} args={[undefined, undefined, kerbCount * 2]}>
        <boxGeometry args={[0.9, 0.06, KERB]} />
        <meshBasicMaterial />
      </instancedMesh>
      <instancedMesh ref={poles} args={[undefined, undefined, poleCount * 2]}>
        <boxGeometry args={[0.16, 9, 0.16]} />
        <meshBasicMaterial color="#24262b" />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, poleCount * 2]}>
        <boxGeometry args={[1.5, 0.22, 0.5]} />
        <meshBasicMaterial color="#3a3c42" />
      </instancedMesh>
      <instancedMesh ref={pools} args={[undefined, undefined, poleCount * 2]}>
        <planeGeometry />
        <meshBasicMaterial map={glow} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
      {lamps.map((p, i) => (
        <sprite key={i} position={p} scale={[4.2, 4.2, 1]}>
          <spriteMaterial map={glow} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}
      <Gantry />
      <GridSlots />
    </group>
  )
}

/** The start gantry the camera leaves behind. Its lights are already out. */
function Gantry() {
  return (
    <group position={[0, 0, -18]}>
      <mesh position={[0, 5.6, 0]}>
        <boxGeometry args={[9.6, 0.9, 0.35]} />
        <meshBasicMaterial color="#17181c" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 4.9, 2.8, 0]}>
          <boxGeometry args={[0.25, 5.6, 0.25]} />
          <meshBasicMaterial color="#17181c" />
        </mesh>
      ))}
      {[-2, -1, 0, 1, 2].map((x) => (
        <mesh key={x} position={[x * 1.3, 5.6, 0.19]}>
          <circleGeometry args={[0.26, 24]} />
          <meshBasicMaterial color="#2a2c31" />
        </mesh>
      ))}
    </group>
  )
}

/** Painted grid boxes behind the start line, staggered left and right. */
function GridSlots() {
  return (
    <group>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[i % 2 ? 2.6 : -2.6, 0.012, 6 - i * 8]}>
          <planeGeometry args={[2.6, 0.16]} />
          <meshBasicMaterial color="#d9d8d2" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

const STREAKS = 140
const STREAK_DEPTH = 120

/** Speed lines. They are always there; only speed makes them visible and long. */
function Streaks() {
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const material = useRef<THREE.MeshBasicMaterial>(null!)
  const streaks = useMemo(
    () =>
      Array.from({ length: STREAKS }, (_, i) => ({
        x: (i % 2 ? 1 : -1) * (6.8 + Math.random() * 9),
        y: 0.15 + Math.random() * 7,
        z: -Math.random() * STREAK_DEPTH,
      })),
    [],
  )
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ camera }) => {
    const cz = camera.position.z
    streaks.forEach((s, i) => {
      while (s.z > cz + 2) s.z -= STREAK_DEPTH
      while (s.z < cz - STREAK_DEPTH) s.z += STREAK_DEPTH
      o.position.set(s.x, s.y, s.z)
      o.scale.set(1, 1, 1 + drive.speed * 14)
      o.updateMatrix()
      mesh.current.setMatrixAt(i, o.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    material.current.opacity = drive.speed * 0.55
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, STREAKS]}>
      <boxGeometry args={[0.025, 0.025, 0.6]} />
      <meshBasicMaterial ref={material} color="#f2f1ec" transparent opacity={0} depthWrite={false} />
    </instancedMesh>
  )
}

export function Scene({ onGl, onFirstFrame }: { onGl: () => void; onFirstFrame: () => void }) {
  return (
    <Canvas
      className="scene"
      aria-hidden
      frameloop="never"
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 56, near: 0.1, far: 420, position: [0, 1.05, 0] }}
      onCreated={onGl}
    >
      <color attach="background" args={['#0E0F11']} />
      <fog attach="fog" args={['#0E0F11', 14, 170]} />
      <Driver onFirstFrame={onFirstFrame} />
      <Rig />
      <Track />
      <Streaks />
    </Canvas>
  )
}
