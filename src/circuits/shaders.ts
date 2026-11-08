import * as THREE from 'three'

import type { Theme } from '#/shell/theme.ts'

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

const GROUND = {
  dark: { ground: '#121316', line: '#737985', haze: '#1B1D22' },
  light: { ground: '#EFEEE9', line: '#7E8187', haze: '#EDEBE6' },
} as const

const STEP = 3
const PHASE = 0.37
const FADE_RADIUS = 0.75
const HAZE_BASE = 2.7
const STRENGTH = 0.55
const CROWD_FROM = 0.15
const CROWD_TO = 0.5

const groundVertex = `
  varying vec3 vWorld;
  varying vec3 vUp;
  void main() {
    vUp = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`

const groundFragment = `
  uniform vec3 uGround;
  uniform vec3 uLine;
  uniform vec3 uHaze;
  uniform float uSpan;
  varying vec3 vWorld;
  varying vec3 vUp;
  void main() {
    float h = vWorld.y;
    float f = fract((h + ${STEP.toFixed(1)} * ${PHASE.toFixed(2)}) / ${STEP.toFixed(1)});
    float w = max(fwidth(h / ${STEP.toFixed(1)}), 1e-4);
    float line = 1.0 - smoothstep(0.0, w * 1.2, min(f, 1.0 - f));
    line *= 1.0 - smoothstep(${CROWD_FROM.toFixed(2)}, ${CROWD_TO.toFixed(2)}, w);
    line *= clamp(((1.0 - abs(normalize(vUp).y)) - 0.0004) / (0.002 - 0.0004), 0.0, 1.0);
    float fade = pow(1.0 - min(length(vWorld.xz) / (uSpan * ${FADE_RADIUS.toFixed(2)}), 1.0), 1.6);
    vec3 c = mix(uGround, uLine, line * fade * ${STRENGTH.toFixed(2)});
    float near = uSpan * ${HAZE_BASE.toFixed(1)} * 0.7;
    float far = uSpan * ${HAZE_BASE.toFixed(1)} * 1.9;
    float haze = pow(clamp((distance(cameraPosition, vWorld) - near) / (far - near), 0.0, 1.0), 1.4);
    gl_FragColor = vec4(mix(c, uHaze, haze), 1.0);
    #include <colorspace_fragment>
  }`

export type Contour = { material: THREE.ShaderMaterial; setTheme: (theme: Theme) => void }

export function contour(theme: Theme, span: number): Contour {
  const uniforms = {
    uGround: { value: new THREE.Color() },
    uLine: { value: new THREE.Color() },
    uHaze: { value: new THREE.Color() },
    uSpan: { value: span },
  }

  const setTheme = (next: Theme) => {
    const p = GROUND[next]

    uniforms.uGround.value.set(p.ground)
    uniforms.uLine.value.set(p.line)
    uniforms.uHaze.value.set(p.haze)
  }

  setTheme(theme)

  return { material: new THREE.ShaderMaterial({ vertexShader: groundVertex, fragmentShader: groundFragment, uniforms }), setTheme }
}

const v = new THREE.Vector3()

export function screen(o: THREE.Object3D, camera: THREE.Camera, w: number, h: number) {
  o.getWorldPosition(v).project(camera)

  if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) return null

  return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h] as const
}

export const damp = (from: number, to: number, dt: number) => from + (to - from) * (1 - Math.exp(-dt * 6))
