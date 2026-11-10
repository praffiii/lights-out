import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { mapUrl, modelUrl } from '#/circuits/Circuit.tsx'
import { lapProfile } from '#/circuits/lap.ts'
import type { CircuitInfo } from '#/circuits/registry.ts'
import { broadcast, isSector, screen, SECTORS } from '#/circuits/shaders.ts'
import { gsap, onEnter, REDUCED } from '#/motion/motion.ts'
import { waitFor } from '#/shell/Loader.tsx'

import { type Drive, LAP_PX, nextTurn, push, resume, seek, SETTLE, step, turnLaps, wrap } from './drive.ts'

const PLAY_SECONDS = 48
const DRAG_PX = 2600
const START_DELAY = 1
const BACK = 250
const RISE = 125
const SIDE = 30
const AHEAD = 0.03
const LOOK_STEP = 0.004
const CHASE_FOV = 44
const INTRO = 2.2
const NEAR_TURN = 0.012
const VISIBLE_AHEAD = 0.14
const ROW_GAP = 0.018
const LIFT = 3
const TRAIL = 16
const TRAIL_GAP = 0.0011
const GAUGE_KMH = 340
const SMALL = 900
const MAX_DT = 0.05

const two = (n: number) => String(n).padStart(2, '0')

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

const RISE_IN: Keyframe[] = [{ opacity: 0, translate: '0 18px', filter: 'blur(6px)' }, { opacity: 1, translate: '0 0', filter: 'blur(0)' }]

const FLASH: Keyframe[] = [
  { opacity: 0, scale: 1.15, filter: 'blur(8px)' },
  { opacity: 1, scale: 1, filter: 'blur(0)', offset: 0.15 },
  { opacity: 0.9, offset: 0.7 },
  { opacity: 0, scale: 0.96 },
]

const HELD: Keyframe[] = [{ opacity: 1 }, { opacity: 1 }]

function glowTexture() {
  const c = document.createElement('canvas')

  c.width = 128
  c.height = 128

  const g = c.getContext('2d')

  if (g) {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)

    r.addColorStop(0, 'rgba(255,255,255,1)')
    r.addColorStop(0.18, 'rgba(255,255,255,0.9)')
    r.addColorStop(0.4, 'rgba(255,255,255,0.25)')
    r.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 128, 128)
  }

  return new THREE.CanvasTexture(c)
}

function run(host: HTMLElement, section: HTMLElement, info: CircuitInfo, gltf: GLTF, map: THREE.Texture, ready: () => void) {
  const el = (selector: string) => {
    const found = host.querySelector<HTMLElement>(selector)

    if (!found) throw new Error(`${selector} is missing`)

    return found
  }

  const canvas = host.querySelector('canvas')

  if (!canvas) throw new Error('the explorer has no canvas')

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  map.flipY = false
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = renderer.capabilities.getMaxAnisotropy()

  const scene = new THREE.Scene()

  scene.background = new THREE.Color('#06080e')
  scene.add(gltf.scene)
  gltf.scene.updateMatrixWorld(true)

  const box = new THREE.Box3()

  gltf.scene.traverse((o) => {
    if (isSector(o.name)) box.expandByObject(o)
  })

  const extent = box.getSize(new THREE.Vector3())
  const { fills } = broadcast(gltf.scene, map, Math.max(extent.x, extent.z))
  const source = gltf.cameras[0]

  if (!(source instanceof THREE.PerspectiveCamera)) throw new Error(`${info.model}.glb has no perspective camera`)

  const camera = new THREE.PerspectiveCamera(source.fov, 1, 2, 40000)
  const overview = { pos: source.getWorldPosition(new THREE.Vector3()), look: box.getCenter(new THREE.Vector3()), fov: source.fov }

  camera.position.copy(overview.pos)
  camera.lookAt(overview.look)

  const { line } = info
  const n = line.length
  const lapMetres = line.reduce((sum, p, i) => sum + Math.hypot((line[(i + 1) % n]?.x ?? p.x) - p.x, (line[(i + 1) % n]?.z ?? p.z) - p.z), 0)
  const profile = lapProfile(line, 1)
  const cruise = (u: number) => (profile.speed(u) / 3.6 / lapMetres) * (profile.seconds / PLAY_SECONDS)
  const lengthKm = Number(info.facts.lengthKm)

  const at = (u: number, out: THREE.Vector3) => {
    const f = wrap(u) * n
    const i = Math.floor(f)
    const a = line[i % n]
    const b = line[(i + 1) % n]

    if (!a || !b) return out.set(0, 0, 0)

    const k = f - i

    return out.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k)
  }

  const nodes: THREE.Object3D[] = []

  gltf.scene.traverse((o) => {
    if (o.name.startsWith('turn-')) nodes.push(o)
  })

  const laps = turnLaps(nodes.map((o) => o.getWorldPosition(new THREE.Vector3())), line)
  const turns = nodes.map((node, i) => ({ n: Number(node.name.slice(5)), u: laps[i] ?? 0, node })).sort((a, b) => a.u - b.u)
  const us = turns.map((t) => t.u)
  const [c1, c2] = info.cuts

  const sectors = [
    { name: 'S1', from: 0, to: c1, colour: SECTORS.S1 },
    { name: 'S2', from: c1, to: c2, colour: SECTORS.S2 },
    { name: 'S3', from: c2, to: 1, colour: SECTORS.S3 },
  ] as const

  const sectorOf = (u: number) => sectors.find((s) => u >= s.from && u < s.to) ?? sectors[2]

  const glowMap = glowTexture()

  const glow = (scale: number, opacity: number) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }))

    sprite.scale.setScalar(scale)

    return sprite
  }

  const head = glow(34, 1)
  const trail = Array.from({ length: TRAIL }, (_, i) => glow(26 - i * 1.2, 0.55 - i * 0.032))

  scene.add(head, ...trail)

  const sectorsEl = el('[data-sectors]')
  const ticksEl = el('[data-ticks]')
  const chipsEl = el('[data-chips]')
  const headEl = el('[data-head]')
  const pill = el('[data-pill]')
  const pillText = el('[data-pill] b')
  const callout = el('[data-callout]')
  const calloutN = el('[data-callout-n]')
  const calloutName = el('[data-callout-name]')
  const flash = el('[data-flash]')
  const kmEl = el('[data-km]')
  const speedEl = el('[data-speed]')
  const gauge = el('[data-gauge]')
  const sectorEl = el('[data-sector]')
  const timeline = el('[data-timeline]')

  const bars = sectors.map((s) => {
    const seg = document.createElement('i')
    const fill = document.createElement('b')

    seg.style.setProperty('--c', s.colour)
    seg.style.flex = String(s.to - s.from)
    seg.appendChild(fill)
    sectorsEl.appendChild(seg)

    return { s, fill }
  })

  let d: Drive = { pos: 0, target: 0, mine: REDUCED, quiet: 0 }
  let holding = false
  let started = REDUCED
  let since = -1
  let blend = 0
  let lastSector = ''
  let lastTurn = -1
  let first = true

  const marks = turns.map((t, i) => {
    const tick = document.createElement('button')
    const chip = document.createElement('span')
    const label = document.createElement('b')
    const before = turns[i - 1]

    tick.type = 'button'
    tick.textContent = two(t.n)
    tick.setAttribute('aria-label', `Turn ${t.n}`)
    tick.style.left = `${t.u * 100}%`
    tick.classList.toggle('high', before !== undefined && t.u - before.u < ROW_GAP && !ticksEl.lastElementChild?.classList.contains('high'))
    tick.addEventListener('pointerdown', (e) => e.stopPropagation())
    tick.addEventListener('click', () => {
      d = seek(d, t.u)
    })
    ticksEl.appendChild(tick)
    label.textContent = two(t.n)
    chip.appendChild(label)
    chipsEl.appendChild(chip)

    return { t, tick, chip }
  })

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()

    const unit = [1, 16, innerHeight][e.deltaMode] ?? 1
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY

    d = push(d, delta * unit)
  }

  let last: { x: number; y: number } | null = null

  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId)
    last = { x: e.clientX, y: e.clientY }
    holding = true
    d = push(d, 0)
  }

  const onMove = (e: PointerEvent) => {
    if (!last) return

    const dx = last.x - e.clientX
    const dy = last.y - e.clientY

    d = push(d, ((Math.abs(dx) > Math.abs(dy) ? dx : dy) * LAP_PX) / DRAG_PX)
    last = { x: e.clientX, y: e.clientY }
  }

  const release = () => {
    last = null
    holding = false
  }

  const fromPointer = (e: PointerEvent) => {
    const r = timeline.getBoundingClientRect()

    return Math.min(0.9999, Math.max(0, (e.clientX - r.left) / r.width))
  }

  const onScrub = (e: PointerEvent) => {
    timeline.setPointerCapture(e.pointerId)
    holding = true
    d = seek(d, fromPointer(e))
  }

  const onScrubMove = (e: PointerEvent) => {
    if (timeline.hasPointerCapture(e.pointerId)) d = seek(d, fromPointer(e))
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return

    e.preventDefault()
    d = push(d, nextTurn(wrap(d.target), us, e.key === 'ArrowRight' ? 1 : -1) * LAP_PX)
  }

  const onPill = () => {
    if (!REDUCED) d = resume(d)
  }

  addEventListener('wheel', onWheel, { passive: false })
  addEventListener('keydown', onKey)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', release)
  timeline.addEventListener('pointerdown', onScrub)
  timeline.addEventListener('pointermove', onScrubMove)
  timeline.addEventListener('pointerup', release)
  timeline.addEventListener('pointercancel', release)
  pill.addEventListener('click', onPill)

  const size = { w: 1, h: 1 }

  const fit = () => {
    size.w = host.clientWidth || 1
    size.h = host.clientHeight || 1
    renderer.setSize(size.w, size.h, false)
    camera.aspect = size.w / size.h
    camera.updateProjectionMatrix()
  }

  const observer = new ResizeObserver(fit)

  observer.observe(host)
  fit()

  const off = onEnter(() => {
    since = 0
  })

  const up = new THREE.Vector3(0, 1, 0)
  const p = new THREE.Vector3()
  const ahead = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const side = new THREE.Vector3()
  const wantPos = new THREE.Vector3()
  const wantLook = new THREE.Vector3()
  const look = overview.look.clone()
  const tmp = new THREE.Vector3()

  const chase = (u: number) => {
    at(u, p)
    at(u + LOOK_STEP, ahead)
    dir.subVectors(ahead, p).setY(0).normalize()
    side.crossVectors(dir, up)
    wantPos.copy(p).addScaledVector(dir, -BACK).addScaledVector(up, RISE).addScaledVector(side, SIDE)
    at(u + AHEAD, wantLook).addScaledVector(up, 6)
  }

  const tick = (_time: number, ms: number) => {
    const dt = Math.min(MAX_DT, ms / 1000)

    if (since >= 0) since += dt

    started = started || d.mine || since > START_DELAY

    const before = d.pos

    d = step(d, dt, { cruise: started && !REDUCED ? cruise(wrap(d.pos)) : 0, holding, turns: us, settle: REDUCED ? Infinity : SETTLE })

    const rate = dt > 0 ? (d.pos - before) / dt : 0
    const u = wrap(d.pos)

    if (started && !REDUCED) blend = Math.min(1, blend + dt / INTRO)

    chase(u)

    const b = ease(blend)
    const follow = 1 - Math.exp(-dt * (blend < 1 ? 60 : 10))

    tmp.lerpVectors(overview.pos, wantPos, b)
    camera.position.lerp(tmp, follow)
    tmp.lerpVectors(overview.look, wantLook, b)
    look.lerp(tmp, follow)
    camera.lookAt(look)
    camera.fov = THREE.MathUtils.lerp(overview.fov, CHASE_FOV, b)
    camera.updateProjectionMatrix()

    for (const f of fills) f.uniforms.uTo.value = started ? u : 1

    at(u, head.position).addScaledVector(up, LIFT)

    for (const [i, m] of trail.entries()) at(u - TRAIL_GAP * (i + 1), m.position).addScaledVector(up, LIFT)

    head.visible = started

    for (const m of trail) m.visible = started && !REDUCED

    const sector = sectorOf(u)

    section.style.setProperty('--accent', sector.colour)
    section.dataset.mode = d.mine ? 'you' : 'auto'
    pill.classList.toggle('you', d.mine)
    pillText.textContent = !d.mine ? 'Auto' : !REDUCED && pill.matches(':hover, :focus-visible') ? 'Resume' : 'You'
    sectorEl.textContent = sector.name

    if (started && sector.name !== lastSector) {
      flash.textContent = sector.name
      flash.animate(REDUCED ? HELD : FLASH, { duration: REDUCED ? 1200 : 1600, easing: 'ease-out' })
    }

    lastSector = started ? sector.name : ''

    for (const { s, fill } of bars) fill.style.width = `${Math.min(1, Math.max(0, (u - s.from) / (s.to - s.from))) * 100}%`

    headEl.style.left = `${u * 100}%`
    kmEl.textContent = (u * lengthKm).toFixed(2)

    const pace = cruise(u)
    const kmh = started ? profile.speed(u) * Math.min(1, pace > 0 ? Math.abs(rate) / pace : 0) : 0

    speedEl.textContent = String(Math.round(kmh))
    gauge.style.width = `${Math.min(100, (kmh / GAUGE_KMH) * 100)}%`

    const near = started ? turns.find((t) => Math.abs(wrap(t.u - u + 0.5) - 0.5) < NEAR_TURN) : undefined

    if (near && near.n !== lastTurn) {
      callout.hidden = false
      calloutN.textContent = `T${two(near.n)}`
      calloutName.textContent = info.corner?.turn === near.n ? info.corner.name : `Turn ${near.n}`

      if (!REDUCED) calloutN.animate(RISE_IN, { duration: 500, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
    }

    if (!near) callout.hidden = true

    lastTurn = near?.n ?? -1

    const next = turns.find((t) => t.u > u) ?? turns[0]

    for (const { t, tick: mark, chip } of marks) {
      mark.classList.toggle('on', t === near)

      const show = !started || wrap(t.u - u) < VISIBLE_AHEAD
      const xy = show ? screen(t.node, camera, size.w, size.h) : null

      chip.style.opacity = xy ? '1' : '0'
      chip.classList.toggle('next', started && t === next)

      if (xy) chip.style.transform = `translate(${xy[0]}px, ${xy[1]}px)`
    }

    renderer.render(scene, camera)

    if (first) {
      first = false
      ready()
    }
  }

  gsap.ticker.add(tick)

  return () => {
    gsap.ticker.remove(tick)
    off()
    observer.disconnect()
    removeEventListener('wheel', onWheel)
    removeEventListener('keydown', onKey)
    ticksEl.replaceChildren()
    chipsEl.replaceChildren()
    sectorsEl.replaceChildren()
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
        o.geometry.dispose()

        for (const m of [o.material].flat()) if (m instanceof THREE.Material) m.dispose()
      }
    })
    map.dispose()
    glowMap.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
  }
}

type Props = { info: CircuitInfo; stage: RefObject<HTMLElement | null>; onReady: () => void; onFail: () => void }

export default function Explorer({ info, stage, onReady, onFail }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onReady, onFail })

  useLayoutEffect(() => {
    callbacks.current = { onReady, onFail }
  }, [onReady, onFail])

  useEffect(() => {
    const host = root.current
    const section = stage.current

    if (!host || !section) return

    const loader = new GLTFLoader()

    loader.setMeshoptDecoder(MeshoptDecoder)

    const loading = Promise.all([loader.loadAsync(modelUrl(info.model)), new THREE.TextureLoader().loadAsync(mapUrl(info.model, innerWidth < SMALL))])
    let gone = false
    let stop = () => {}

    waitFor(loading)
    loading
      .then(([gltf, map]) => {
        if (!gone) stop = run(host, section, info, gltf, map, () => callbacks.current.onReady())
      })
      .catch(() => {
        if (!gone) callbacks.current.onFail()
      })

    return () => {
      gone = true
      stop()
    }
  }, [info, stage])

  return (
    <div className="drive" ref={root}>
      <canvas aria-hidden />
      <div className="vignette" aria-hidden />
      <div className="chips" data-chips aria-hidden />
      <dl className="read">
        <div>
          <dt>Sector</dt>
          <dd data-sector />
        </div>
        <div>
          <dt>Distance</dt>
          <dd>
            <span data-km /> <small>/ {info.facts.lengthKm} km</small>
          </dd>
        </div>
        <div>
          <dt>Est. speed</dt>
          <dd>
            <span data-speed /> <small>km/h</small>
            <span className="gauge" aria-hidden>
              <b data-gauge />
            </span>
          </dd>
        </div>
      </dl>
      <div className="callout" data-callout hidden>
        <span data-callout-n />
        <em data-callout-name />
      </div>
      <div className="flash" data-flash aria-hidden />
      <div className="hud bottom">
        <button type="button" className="mode" data-pill>
          <i aria-hidden />
          <b />
        </button>
        <div className="timeline" data-timeline>
          <div className="ticks" data-ticks />
          <div className="sectors" data-sectors aria-hidden />
          <span className="head" data-head aria-hidden />
        </div>
        <span className="hint">Scroll to drive · Tap a number to jump</span>
      </div>
    </div>
  )
}
