import * as THREE from 'three'

import { SECTORS } from '#/circuits/shaders.ts'

export const SECTOR_PURPLE = SECTORS.S1

const LIGHT_GAIN = 2

const vertexShader = `
  varying vec2 vLight;
  void main() {
    vLight = color.rg;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`

const fragmentShader = `
  uniform vec3 uClay;
  uniform vec3 uTint;
  uniform float uMix;
  uniform float uLit;
  varying vec2 vLight;
  void main() {
    float light = mix(vLight.x, vLight.y, uMix) * ${LIGHT_GAIN.toFixed(1)};
    gl_FragColor = vec4(light * mix(uClay, uTint, uLit), 1.0);
    #include <colorspace_fragment>
  }`

export function clayMaterial(clay: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uClay: { value: new THREE.Color(clay) }, uTint: { value: new THREE.Color(SECTOR_PURPLE) }, uMix: { value: 0 }, uLit: { value: 0 } },
    vertexColors: true,
    vertexShader,
    fragmentShader,
  })
}

const PLANE_FADE = 0.06

const shadowVertex = `
  varying vec2 vUv;
  varying vec4 vClip;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vClip = gl_Position;
  }`

const shadowFragment = `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform float uMix;
  uniform float uEdge;
  varying vec2 vUv;
  varying vec4 vClip;
  void main() {
    vec2 ndc = abs(vClip.xy / vClip.w);
    vec2 rim = min(vUv, 1.0 - vUv);
    float screen = uEdge > 0.0 ? 1.0 - smoothstep(1.0 - uEdge, 1.0, max(ndc.x, ndc.y)) : 1.0;
    float plane = smoothstep(0.0, ${PLANE_FADE.toFixed(2)}, min(rim.x, rim.y));
    gl_FragColor = vec4(0.0, 0.0, 0.0, mix(texture2D(uA, vUv).r, texture2D(uB, vUv).r, uMix) * screen * plane);
  }`

export function shadowMaterial(a: THREE.Texture, b: THREE.Texture, edge: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uA: { value: a }, uB: { value: b }, uMix: { value: 0 }, uEdge: { value: edge } },
    vertexShader: shadowVertex,
    fragmentShader: shadowFragment,
    transparent: true,
    depthWrite: false,
  })
}
