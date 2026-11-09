# Broadcast Circuits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Home hero and the Race weekend circuit band show each circuit as a glowing sector-coloured ribbon on a dark, baked OpenStreetMap context map, always on a dark "broadcast screen".

**Architecture:** Blender bakes everything heavy once per circuit: a top-down map texture from OSM, terrain UVs into it, extruded large buildings, glowing strips and a halo per sector, label anchors beside the road, and an emission-only poster that matches the runtime. The runtime keeps today's R3F scene, camera fitting, lap light and DOM pins, and swaps the matte and contour shaders for an unlit map ground, glowing strips with the existing lap fill, and an additive halo. No post-processing pass, in the browser or in the poster.

**Tech Stack:** Blender 5.2 (Eevee), Python 3 (prep), Overpass API, cwebp, three.js / R3F, Bun tests, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-broadcast-circuits-design.md`

## Global Constraints

- Circuits: br-1940, us-2023, qa-2004, ae-2009, au-1953. Nothing else.
- Sector colours stay `S1 #A43BFF`, `S2 #2BD45E`, `S3 #F5C400`. The broadcast background is `#06080E`, in the scene, the poster and the section behind them.
- Circuit sections (Home `.hero`, weekend `.band`) carry `data-theme="dark"` in both site themes; the header's logo and buttons are dark while the header is transparent over the hero. Nothing else changes theme.
- Camera pitch 36° for every circuit.
- Credit wherever the map shows: `Map © OpenStreetMap contributors (ODbL)`.
- Budgets: br-1940's measured sizes × 1.3, agreed with Praffi at the Task 3 checkpoint, written into the asset test in Task 4.
- Raw OSM json is git-ignored. Only baked outputs are committed. The glb embeds no images.
- Every commit leaves `bun run lint`, `bun test` and the hero, weekend and sections e2e green.
- No code comments, no `as` (except `as const`), no `any`, no `!`.
- Commits: conventional, present tense, no Co-Authored-By trailer. Local only until Praffi says push.

## Review Focus

1. A phone given a 4096² map (about 85 MB of GPU memory with mipmaps): phones load only the 2048 map. Pinned by an e2e request check in Task 5.
2. Light theme: text, buttons and focus rings in the forced-dark hero and band, and the header over the hero, read as dark-theme ink, and the header's weekend panel keeps its current theme. Pinned in Task 1.
3. The map request hangs or fails: the poster stays and no error shows, as for the glb today. Pinned in Task 5.
4. Spin to ±45° on desktop and phone: no hard map edge, no smeared border texels across the apron, every pin inside. Pinned in Task 5 (map fade and outside-map colour) and by the 45° test running on both projects.
5. Map orientation: the map in WebGL lines up with the poster (glTF UVs need `flipY = false`). Checked in Task 5 against the lakes inside Interlagos.

Reduced motion keeps today's behaviour: the hero shows the poster, and the band draws its static scene with no motion. The hero's grey waiting poster also stays as it is today.

---

### Task 1: Circuit sections are always dark

**Files:**
- Modify: `src/styles/site.css`, `src/shell/Header.tsx`, `src/shell/WeekendBox.tsx` (takes the dark state for its trigger), `src/home/Hero.tsx`, `src/weekend/CircuitBand.tsx` and its caller
- Test: `e2e/sections.spec.ts`

**Interfaces:**
- Produces: `.hero` and `.band` render with `data-theme="dark"` and `--bg: #06080E` in both themes; on `/`, while the header is not solid and the menu is closed, the logo, weekend trigger and menu button carry `data-theme="dark"` (not the `<header>`, so the weekend panel's own `opposite(theme)` is unchanged). `CircuitBand` loses its `theme` prop; `Circuit` keeps `theme` until Task 5 and is always given `'dark'`.

- [ ] **Step 1: Write the failing test** in `e2e/sections.spec.ts`, both projects:

```ts
test('the circuit sections and the header over the hero stay dark in the light theme', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'))
  const colours = (selector: string) => page.locator(selector).first().evaluate((n) => ({ bg: getComputedStyle(n).backgroundColor, ink: getComputedStyle(n).color }))

  await page.goto('/')
  expect(await colours('.hero')).toEqual({ bg: 'rgb(6, 8, 14)', ink: 'rgb(242, 241, 236)' })
  expect((await colours('.header .logo')).ink).toBe('rgb(242, 241, 236)')

  await page.goto('/weekend')
  expect(await colours('.weekend-page .band')).toEqual({ bg: 'rgb(6, 8, 14)', ink: 'rgb(242, 241, 236)' })
})
```

- [ ] **Step 2: Run** `bunx playwright test e2e/sections.spec.ts -g "stay dark"`. Expected: FAIL (`.hero` background is the light token).
- [ ] **Step 3: Implement.** `site.css`: `[data-theme] { color: var(--ink); }`; `.hero, .band { --bg: #06080e; background: var(--bg); }`. Both sections get `data-theme="dark"` and use the `-dark` posters. `Header` puts `data-theme="dark"` on its logo and buttons under the condition above.
- [ ] **Step 4: Run** the test, then `bunx playwright test e2e/sections.spec.ts e2e/hero.spec.ts e2e/weekend.spec.ts e2e/home.spec.ts`. Expected: PASS. Capture `/season` in light theme and check the TitleFight caption is unchanged.
- [ ] **Step 5: Commit** `feat(circuits): the hero and the circuit band stay dark in the light theme`.

### Task 2: prep fetches the OSM context

**Files:**
- Modify: `blender/circuits/prep.py`, `blender/circuits/build.sh`, `.gitignore` (`blender/circuits/data/*-osm.json`)

**Interfaces:**
- Produces: `python3 -I prep.py osm <id>` writes `data/{id}-osm.json`, the Overpass `out geom` response for the layout bbox plus 1 km (the mock's area): `building`, `highway` (the mock's `WIDTHS` types), `natural=water`, `waterway=riverbank`, `leisure=park|pitch`, `landuse=grass|forest|recreation_ground|meadow`. `prep.py <id>` (terrain) is unchanged and never runs for OSM alone.

- [ ] **Step 1:** Add the `osm` entry point: query from the layout bbox, POST to `overpass.private.coffee`, then `overpass-api.de`, then `overpass.kumi.systems`, each retried after 10/30/60 s on 429, 5xx or timeout; write the file; print element counts by kind. `build.sh` runs `prep.py osm "$id"` when only `data/$id-osm.json` is missing.
- [ ] **Step 2: Run** it for all five. Expected: five files with buildings > 0 and highways > 0; `git status` shows none of them and no change to the committed `-m`, `-elevation`, `-terrain` json.
- [ ] **Step 3: Commit** `feat(circuits): prep fetches each circuit's OpenStreetMap context`.

### Task 3: Blender bakes br-1940, and Praffi checks it

**Files:**
- Create: `blender/circuits/broadcast.py` (from the session mock `map.py`: `Local`, `map_texture`, `blocks`, `outward`, `on_ground`, strip building)
- Modify: `blender/circuits/build.py` (`PITCH = 36`, exaggeration 1.5, no compositor bloom, label empties in `box()`), `blender/circuits/build.sh` (cwebp resizes)

**Interfaces:**
- Consumes: `data/br-1940-osm.json` (Task 2); `circuit.Track`, `ribbon`, `terrain`, `bar`.
- Produces for br-1940, the contract for every circuit:
  - `public/circuits/{id}.glb` (exported with `export_image_format="NONE"`), meshes: `ground` (UV `0..1` across the map extent, beyond it outside), `blocks`, `road` (dark slab, 24 m, lip 4 m), `S1`/`S2`/`S3` (each three strips, a 4.5 m core and two 2 m edges at ±11 m, all with UV `x` = lap fraction), `S1-halo`…`S3-halo` (wider strip 0.05 m above the road, UV `x` = lap fraction, `y` = 0..1 across), `start`; empties `turn-N` 62 m outward and `sector-1`…`sector-3` 150 m outward from their sector's middle (`outward` + `on_ground`); the camera.
  - `public/circuits/{id}-map.webp` (4096 px long side) and `{id}-map-2048.webp`, covering the layout bbox plus 1 km; record metres per pixel.
  - `public/circuits/{id}.webp` (2880×1800, Eevee, emission-only materials matching Task 5's shaders, the map fading to plain ground over its outer 15%) and `{id}-1440.webp` by `cwebp -resize`. The old `{id}-light*` and `{id}-dark*` posters stay until Task 5.
  - `src/circuits/pins/{id}.json` (turns, `sector-1`…`sector-3`, crop including the label empties) and `src/circuits/lines/{id}.json`.

- [ ] **Step 1: Implement** `broadcast.py` and the build changes. Glow palette from the mock: `bg #06080E`, `ground #0A0E18`, `minor #172033`, `major #22304C`, `water #081226`, `green #0A1019`, `foot #0D1220`, `block #131A2B`, `road #111726`. Keep `frame()`'s azimuth search, `FREE` and `KEEP_OUT`.
- [ ] **Step 2: Run** `sh blender/circuits/build.sh br-1940`, then `bun test` and the hero, weekend and sections e2e. Expected: the files above; tests still pass on today's runtime (the pins json gains `sector-N` keys, which `pinsOf` ignores).
- [ ] **Step 3: Checkpoint with Praffi.** Show `br-1940.webp` beside the approved `glow-dark.png` with: the five sizes; the bytes a 390×844 DPR 3 phone actually transfers for the hero (selected poster + glb + map), measured with Playwright on this branch and on `main` (today: br-1940 poster 31,786 B at 1440 or 85,192 B full, whichever `srcset` picks, plus the 315,272 B glb), and the selected poster as the LCP image; metres per pixel next to the mock's 0.6. Ask: does the halo read without bloom (if not, the desktop-only bloom fallback is decided now); are upright DOM labels fine or must they lie flat on the ground; are the budgets OK.
- [ ] **Step 4: Commit** `feat(circuits): Blender bakes Interlagos as a glowing ribbon on its OpenStreetMap map`.

### Task 4: The other four circuits

**Files:**
- Modify: `public/circuits/*`, `src/circuits/pins/*.json`, `src/circuits/lines/*.json`
- Create: `test/circuits/assets.test.ts`

- [ ] **Step 1: Write the failing test** `assets.test.ts`: for every circuit, `{model}.webp`, `-1440.webp`, `-map.webp`, `-map-2048.webp` and `.glb` exist under the agreed budgets, and the glb's JSON chunk has no `images`.
- [ ] **Step 2: Run** `bun test test/circuits/assets.test.ts`. Expected: FAIL for the four unbuilt circuits.
- [ ] **Step 3: Build** `sh blender/circuits/build.sh <id>` for us-2023, qa-2004, ae-2009, au-1953; check each poster's framing.
- [ ] **Step 4: Run** `bun test` and the hero, weekend and sections e2e. Expected: PASS.
- [ ] **Step 5: Commit** `feat(circuits): Las Vegas, Losail, Yas Marina and Albert Park glow on their maps`.

### Task 5: The runtime draws the broadcast look

**Files:**
- Modify: `src/circuits/shaders.ts` (replace `mattify`, `groundOf`, `PALETTE`, `GROUND` and their shaders), `src/circuits/Circuit.tsx`, `src/circuits/fit.ts` (`SQUASH` from 36°), `src/circuits/registry.ts` (drop `relief`; add `sectors`), `src/home/Hero.tsx` (the contour note line becomes the OSM credit), `src/weekend/CircuitBand.tsx` (`data-pin="sector-N"`, OSM credit)
- Delete: `public/circuits/*-light*.webp`, `public/circuits/*-dark*.webp`, `test/circuits/posters.test.ts`, `test/circuits/ground.test.ts`
- Test: `test/circuits/broadcast.test.ts`, `test/circuits/fit.test.ts` (drop the `relief` test), `test/circuits/registry.test.ts`, `test/circuits/assets.test.ts`, `e2e/hero.spec.ts`, `e2e/weekend.spec.ts` (the Sectors toggle test selects `sector-1`)

**Interfaces:**
- Consumes: Tasks 3–4's mesh names, UVs, empties and files.
- Produces: `broadcast(scene: THREE.Object3D, map: THREE.Texture, span: number): { fills: ReadonlyArray<{ uniforms: { uTo: { value: number } } }> }`; `mapUrl(model: string, small: boolean): string` beside `modelUrl`; `Circuit` loses its `theme` prop; posters load from `/circuits/{model}.webp`; `CircuitInfo.sectors: ReadonlyArray<{ n: 1 | 2 | 3; x: number; y: number }>`, read from the pins json's `sector-N` by a reader beside `pinsOf`; the band credit and the hero note end with `Map © OpenStreetMap contributors (ODbL)`.

- [ ] **Step 1: Write the failing tests.** `broadcast.test.ts`: a group with meshes `ground`, `S1`, `S1-halo`, `blocks`; after `broadcast(group, texture, 100)` the ground's `uMap` uniform is the texture; setting `fills[0].uniforms.uTo.value` reaches `S1` and `S1-halo`; `S1-halo`'s material is `transparent`, `depthWrite: false`, `THREE.AdditiveBlending`; a second call returns the same materials. `fit.test.ts`: the 36° squash. `assets.test.ts`: no `-light` or `-dark` poster exists. e2e: a phone requests `*-map-2048.webp` and never `*-map.webp`; with `**/circuits/*-map*.webp` hung (as `hero.spec.ts:148` hangs the glb) the poster stays with no page errors on `/` and `/weekend`; remove the desktop-only skip from "the spin stops at 45 degrees with every pin inside the stage". `registry.test.ts`: every circuit has three sectors with coordinates. e2e: once WebGL is ready the band's `sector-1` pin has moved from its poster position; `.band .credit` and the hero note contain `OpenStreetMap`, and the hero note no longer contains `Contours`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** Ground: unlit `uMap`, faded to plain ground over the outer 15% of UV space and plain outside `0..1`, then the existing camera-distance haze toward `#06080E`. Strips: sector colour × 1.6 where filled, × 0.25 where not, using the existing `vLap`/`uFrom`/`uTo` test. Halo: `exp(-k·(uv.y−0.5)²)` × sector colour × fill, additive, `polygonOffset`. Blocks: flat dark with a fixed top-light shade. Lap light and trail: white. `Circuit` calls `useLoader.preload(TextureLoader, url)` before the glb `useLoader`, then `useLoader(TextureLoader, url)` with `flipY = false`, sRGB, anisotropy 8; `small` is `innerWidth < 900` at mount. Delete the runtime sector-anchor loop (`Circuit.tsx:150-161`) and the `<primitive>` re-mount of non-turn markers (`Circuit.tsx:341-345`); the marker traversal collects `turn-` and `sector-` empties from `gltf.scene`. Hero and band posters switch to `{model}.webp`; delete the old posters.
- [ ] **Step 4: Run** `bun run lint`, `bun test`, and the hero, weekend and sections e2e. Expected: PASS. Capture br-1940 in WebGL beside its poster and check the infield lakes sit in the same place.
- [ ] **Step 5: Commit** `feat(circuits): the circuit glows in sector colours on its map`.

### Task 6: Broadcast pins

**Files:**
- Modify: `src/home/Hero.tsx`, `src/weekend/CircuitBand.tsx`, `src/styles/home.css`, `src/styles/weekend.css`
- Test: `e2e/hero.spec.ts`, `e2e/weekend.spec.ts`

**Interfaces:**
- Produces: turn pins read `01`…; sector pins (`data-pin="sector-N"`, from `CircuitInfo.sectors`) read `S1` with a `SECTOR 1` caption, now in the hero too, placed from the pins json before WebGL is ready.

- [ ] **Step 1: Write the failing tests:** `/weekend` first turn pin reads `01`; `/` T1 pin reads `01` and the hero shows `S1` `S2` `S3` pins inside the stage.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the tile style (tile `#2A3655`, white mono numerals, 1 px light rim) and the flat sector label style from the mock.
- [ ] **Step 4: Run** `bun test` and the hero, weekend and sections e2e. Expected: PASS, including 45° on both projects.
- [ ] **Step 5: Commit** `feat(circuits): turn pins read as broadcast tiles and the hero labels its sectors`.

### Task 7: Proof and docs

**Files:**
- Modify: `DESIGN.md` (line 20 "matte", line 23 "no glow effects… no track used as a background", line 30 "Look. Matte and unlit", line 31 "Poster frame… in both themes", line 32 Circuits, rule 4 at line 118)

- [ ] **Step 1:** Capture the hero (desktop light, desktop dark, phone) and the band (desktop, phone) for two circuits beside the approved mocks.
- [ ] **Step 2:** Update DESIGN.md: circuits glow on their OSM map, circuit sections are always dark, one dark poster, the OSM credit.
- [ ] **Step 3: Run** `bun run lint`, `bun test`, full `bunx playwright test`. Expected: all pass.
- [ ] **Step 4: Commit** `docs(design): circuits glow on their OpenStreetMap map`.
