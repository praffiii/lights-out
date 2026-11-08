import * as THREE from 'three'
import { LIGHT, RELIEF, SIDE } from './tokens'

const vertexShader = /* glsl */ `
  varying float vLap;
  varying vec3 vNormal;
  void main() {
    vLap = uv.x;
    // world normal, back in Blender's frame (z up) so the formula reads the same as blender/circuit.py
    vec3 n = normalize(mat3(modelMatrix) * normal);
    vNormal = vec3(n.x, -n.z, n.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`

/**
 * The one material: matte and unlit, like the Blender renders. Flat tops are the colour, walls are SIDE of it,
 * slopes get a hillshade. Same formula as material() in blender/circuit.py.
 * On the track ribbons, UV.x is the lap fraction: only [uFrom, uTo] (wrapping past the line) takes uColor,
 * the rest is uBase. Meshes without UVs read 0, so a range of [0, 2] colours them whole.
 */
const fragmentShader = /* glsl */ `
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

export type Matte = THREE.ShaderMaterial & {
  uniforms: {
    uColor: { value: THREE.Color }
    uBase: { value: THREE.Color }
    uFrom: { value: number }
    uTo: { value: number }
  }
}

export const matte = (color: string): Matte =>
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uBase: { value: new THREE.Color(color) },
      uFrom: { value: 0 },
      uTo: { value: 2 },
    },
  }) as Matte

export const isMesh = (o: THREE.Object3D): o is THREE.Mesh => (o as THREE.Mesh).isMesh === true

/**
 * Give every mesh a matte material, once per Blender material name. Idempotent, because StrictMode runs
 * memos twice and the scene must keep the materials we later update.
 */
export function mattify(scene: THREE.Object3D, colorOf: (material: string, mesh: string) => string) {
  const byName = new Map<string, Matte>()
  scene.traverse((o) => {
    if (!isMesh(o)) return
    const current = o.material as THREE.Material
    const key = (current.userData.blender as string | undefined) ?? current.name
    let m = byName.get(key)
    if (!m) {
      m = (current as Matte).uniforms?.uColor ? (current as Matte) : matte(colorOf(key, o.name))
      m.userData.blender = key
      byName.set(key, m)
    }
    o.material = m
  })
  return byName
}

/** Screen position of an object, or null when it is behind the camera or off screen. */
const v = new THREE.Vector3()
export function screen(o: THREE.Object3D, camera: THREE.Camera, w: number, h: number) {
  o.getWorldPosition(v).project(camera)
  if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) return null
  return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h] as const
}

export const scrollProgress = () => {
  const el = document.documentElement
  return Math.min(1, Math.max(0, window.scrollY / Math.max(1, el.scrollHeight - window.innerHeight)))
}
export const damp = (from: number, to: number, dt: number) => from + (to - from) * (1 - Math.exp(-dt * 6))
