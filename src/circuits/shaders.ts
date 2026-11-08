import * as THREE from 'three'

export const SECTORS = {
  S1: '#A43BFF',
  S2: '#2BD45E',
  S3: '#F5C400',
} as const

export type Sector = keyof typeof SECTORS

export const isSector = (name: string): name is Sector => name in SECTORS

export const PALETTE = {
  light: { bg: '#F4F3EF', ink: '#111214', unfilled: '#CAC8C1' },
  dark: { bg: '#0E0F11', ink: '#F2F1EC', unfilled: '#3A3C42' },
} as const

const SIDE = 0.62
const RELIEF = 0.35
const LIGHT = [-0.6, 0.8] as const

const vertexShader = `
  varying float vLap;
  varying vec3 vNormal;
  void main() {
    vLap = uv.x;
    vec3 n = normalize(mat3(modelMatrix) * normal);
    vNormal = vec3(n.x, -n.z, n.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`

const fragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uBase;
  uniform float uFrom;
  uniform float uTo;
  varying float vLap;
  varying vec3 vNormal;
  void main() {
    vec3 n = normalize(vNormal);
    float shade = ${SIDE.toFixed(2)} + ${(1 - SIDE).toFixed(2)} * n.z + ${RELIEF.toFixed(2)} * n.z * dot(n.xy, vec2(${LIGHT[0].toFixed(2)}, ${LIGHT[1].toFixed(2)}));
    shade = clamp(shade, 0.4, 1.15);
    bool on = uFrom <= uTo ? (vLap >= uFrom && vLap <= uTo) : (vLap >= uFrom || vLap <= uTo);
    vec3 c = on ? uColor : uBase;
    gl_FragColor = vec4(c * shade, 1.0);
    #include <colorspace_fragment>
  }`

export type Matte = {
  material: THREE.ShaderMaterial
  uniforms: { uColor: { value: THREE.Color }; uBase: { value: THREE.Color }; uFrom: { value: number }; uTo: { value: number } }
}

const matte = (color: string): Matte => {
  const uniforms = {
    uColor: { value: new THREE.Color(color) },
    uBase: { value: new THREE.Color(color) },
    uFrom: { value: 0 },
    uTo: { value: 2 },
  }

  return { material: new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms }), uniforms }
}

const made = new WeakMap<THREE.Material, { key: string; matte: Matte }>()

export function mattify(scene: THREE.Object3D, colorOf: (material: string) => string) {
  const byName = new Map<string, Matte>()

  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material) || !(o.material instanceof THREE.Material)) return

    const known = made.get(o.material)
    const key = known?.key ?? o.material.name
    const m = byName.get(key) ?? known?.matte ?? matte(colorOf(key))

    made.set(m.material, { key, matte: m })
    byName.set(key, m)
    o.material = m.material
  })

  return byName
}

const v = new THREE.Vector3()

export function screen(o: THREE.Object3D, camera: THREE.Camera, w: number, h: number) {
  o.getWorldPosition(v).project(camera)

  if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) return null

  return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h] as const
}

export const damp = (from: number, to: number, dt: number) => from + (to - from) * (1 - Math.exp(-dt * 6))
