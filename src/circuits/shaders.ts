import * as THREE from 'three'

export const SECTORS = {
  S1: '#A43BFF',
  S2: '#2BD45E',
  S3: '#F5C400',
} as const

export type Sector = keyof typeof SECTORS

export const isSector = (name: string): name is Sector => name in SECTORS

const PAL = { haze: '#06080E', ground: '#0A0E18', blocks: '#131A2B', road: '#111726', start: '#FFFFFF' } as const

const STREETS = { 'streets-major': '#22304C', 'streets-minor': '#172033' } as const

const isStreet = (name: string): name is keyof typeof STREETS => name in STREETS

const FADE = 0.15
const DIST = 2.7
const GLOW = 1.6
const UNFILLED = 0.25
const HALO_K = 18
const HALO_GAIN = 0.6
const LABEL_HALO_GAIN = 0.35
const TOP_LIGHT = 0.25
const OFFSET = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 } as const

const glsl = (n: number) => n.toFixed(3)

const uvVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`

const groundVertex = `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`

const groundFragment = (source: string) => `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform vec3 uGround;
  uniform vec3 uHaze;
  uniform float uSpan;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vec2 e = min(vUv, 1.0 - vUv);
    float inside = smoothstep(0.0, ${glsl(FADE)}, min(e.x, e.y));
    vec3 c = mix(uGround, ${source}, inside);
    float near = uSpan * ${glsl(DIST * 0.7)};
    float far = uSpan * ${glsl(DIST * 1.9)};
    float haze = pow(clamp((distance(cameraPosition, vWorld) - near) / (far - near), 0.0, 1.0), 1.4);
    gl_FragColor = vec4(mix(c, uHaze, haze), 1.0);
    #include <colorspace_fragment>
  }`

const stripFragment = `
  uniform vec3 uColor;
  uniform float uTo;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(uColor * (vUv.x <= uTo ? ${glsl(GLOW)} : ${glsl(UNFILLED)}), 1.0);
    #include <colorspace_fragment>
  }`

const haloFragment = `
  uniform vec3 uColor;
  uniform float uTo;
  varying vec2 vUv;
  void main() {
    float d = vUv.y - 0.5;
    float a = exp(${glsl(-HALO_K)} * d * d) * ${glsl(HALO_GAIN)} * (vUv.x <= uTo ? 1.0 : ${glsl(UNFILLED)});
    gl_FragColor = vec4(uColor * a, 1.0);
    #include <colorspace_fragment>
  }`

const labelFragment = (gain: number, additive: boolean) => `
  uniform vec3 uColor;
  uniform float uTo;
  uniform vec2 uLap;
  void main() {
    float w = smoothstep(uLap.x, uLap.y, uTo);
    gl_FragColor = ${additive ? `vec4(uColor * ${glsl(gain)} * w, 1.0)` : `vec4(uColor * ${glsl(gain)}, w)`};
    #include <colorspace_fragment>
  }`

const blockFragment = `
  uniform vec3 uColor;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    gl_FragColor = vec4(uColor * (${glsl(1 - TOP_LIGHT)} + ${glsl(TOP_LIGHT)} * n.y), 1.0);
    #include <colorspace_fragment>
  }`

const flatFragment = `
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
    #include <colorspace_fragment>
  }`

type Uniform<T> = { value: T }

export type Fill = { uniforms: { uTo: Uniform<number> } }

export type Broadcast = { fills: ReadonlyArray<Fill> }

const color = (hex: string) => ({ value: new THREE.Color(hex) })

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...OFFSET } as const

const lapOf = (mesh: THREE.Mesh) => {
  const uv = mesh.geometry.getAttribute('uv')
  let lo = 1
  let hi = 0

  for (let i = 0; i < uv.count; i++) {
    lo = Math.min(lo, uv.getX(i))
    hi = Math.max(hi, uv.getX(i))
  }

  return new THREE.Vector2(lo, hi)
}

const PART = /^(S[123])(-label)?(-halo)?$/

const prepared = new WeakMap<THREE.Object3D, { result: Broadcast; map: Uniform<THREE.Texture> }>()

export function broadcast(scene: THREE.Object3D, map: THREE.Texture, span: number): Broadcast {
  const known = prepared.get(scene)

  if (known) {
    known.map.value = map

    return known.result
  }

  const fill = (): Fill => ({ uniforms: { uTo: { value: 1 } } })
  const fills = { S1: fill(), S2: fill(), S3: fill() } satisfies Record<Sector, Fill>
  const laps = new Map<string, THREE.Vector2>()
  const made = new Map<string, THREE.ShaderMaterial>()
  const mapUniform = { value: map }

  scene.traverse((o) => {
    if (o instanceof THREE.Mesh && isSector(o.name)) laps.set(o.name, lapOf(o))
  })

  const create = (name: string, material: string) => {
    const part = PART.exec(name)
    const sector = part?.[1]

    if (part && sector && isSector(sector)) {
      const uniforms = { uColor: color(SECTORS[sector]), uTo: fills[sector].uniforms.uTo, uLap: { value: laps.get(sector) ?? new THREE.Vector2(0, 1) } }
      const [label, halo] = [part[2] !== undefined, part[3] !== undefined]

      if (label) return new THREE.ShaderMaterial({ name, uniforms, vertexShader: uvVertex, fragmentShader: labelFragment(halo ? LABEL_HALO_GAIN : GLOW, halo), ...(halo ? additive : { transparent: true, depthWrite: false, ...OFFSET }) })

      if (halo) return new THREE.ShaderMaterial({ name, uniforms, vertexShader: uvVertex, fragmentShader: haloFragment, ...additive })

      return new THREE.ShaderMaterial({ name, uniforms, vertexShader: uvVertex, fragmentShader: stripFragment })
    }

    const surface = { uGround: color(PAL.ground), uHaze: color(PAL.haze), uSpan: { value: span } }

    if (name === 'ground') return new THREE.ShaderMaterial({ name, uniforms: { uMap: mapUniform, ...surface }, vertexShader: groundVertex, fragmentShader: groundFragment('texture2D(uMap, clamp(vUv, 0.0, 1.0)).rgb') })

    if (isStreet(name)) return new THREE.ShaderMaterial({ name, uniforms: { uColor: color(STREETS[name]), ...surface }, vertexShader: groundVertex, fragmentShader: groundFragment('uColor'), ...OFFSET })

    if (name === 'blocks') return new THREE.ShaderMaterial({ name, uniforms: { uColor: color(PAL.blocks) }, vertexShader: groundVertex, fragmentShader: blockFragment })

    return new THREE.ShaderMaterial({ name, uniforms: { uColor: color(material === 'start' ? PAL.start : PAL.road) }, vertexShader: uvVertex, fragmentShader: flatFragment })
  }

  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !(o.material instanceof THREE.Material)) return

    const m = made.get(o.name) ?? create(o.name, o.material.name)

    made.set(o.name, m)
    o.material = m
  })

  const result = { fills: [fills.S1, fills.S2, fills.S3] }

  prepared.set(scene, { result, map: mapUniform })

  return result
}

const v = new THREE.Vector3()

export function screen(o: THREE.Object3D, camera: THREE.Camera, w: number, h: number) {
  o.getWorldPosition(v).project(camera)

  if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) return null

  return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h] as const
}

export const damp = (from: number, to: number, dt: number) => from + (to - from) * (1 - Math.exp(-dt * 6))
