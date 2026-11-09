# Broadcast Circuits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Home hero and the Race weekend circuit band show each circuit as a glowing sector-coloured ribbon on a dark, baked OpenStreetMap context map, always on a dark "broadcast screen".

**Architecture:** Blender bakes everything heavy once per circuit: a top-down map texture from OSM, terrain UVs into it, extruded large buildings, core and halo ribbons per sector, and a dark poster. The runtime keeps today's R3F scene, camera fitting, lap light and DOM pins, and swaps the matte and contour shaders for an unlit map ground, a glowing core with the existing lap fill, and an additive halo. No post-processing pass.

**Tech Stack:** Blender 5.2 (Cycles for posters, Eevee for the map bake), Python 3 (prep), Overpass API, three.js / R3F, Bun tests, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-broadcast-circuits-design.md`

## Global Constraints

- Circuits: br-1940, us-2023, qa-2004, ae-2009, au-1953. Nothing else.
- Sector colours stay `S1 #A43BFF`, `S2 #2BD45E`, `S3 #F5C400`.
- Circuit sections (Home `.hero`, weekend `.band`) carry `data-theme="dark"` in both site themes. Nothing else on the page changes theme.
- Credit wherever the map shows: `© OpenStreetMap contributors (ODbL)` appended to the existing credit line.
- Budgets per circuit: map ≤ 600 KB (4096 px) and ≤ 200 KB (2048 px); glb ≤ 600 KB; poster ≤ 700 KB full, ≤ 250 KB at 1440.
- Raw OSM json is git-ignored. Only baked outputs are committed.
- No code comments, no `as` (except `as const`), no `any`, no `!`. `bun run lint` passes.
- Commits: conventional, present tense, no Co-Authored-By trailer. Local only until Praffi says push.

## Review Focus

1. A phone GPU given a 4096² map texture (about 85 MB with mipmaps): phones (stage under 900 css px wide) must load the 2048 map.
2. Light theme: every text, button and focus ring inside the forced-dark hero and band reads as dark-theme ink, and the hero's bottom fade blends into the dark section, not into the light page.
3. The map texture fails to load or decode: the poster stays and the page shows no error, as it does today when the glb fails.
4. Drag-to-spin at ±45°: the haze and the map's far edge never show a hard tile edge or a ground hole.
5. Reduced motion: the poster (now the glow look) is what shows, with no lap light, and the credit still names OSM.

---

### Task 1: Circuit sections are always dark

**Files:**
- Modify: `src/styles/site.css` (after the two theme token rules)
- Modify: `src/home/Hero.tsx`, `src/weekend/CircuitBand.tsx`, `src/weekend/WeekendPage.tsx` (or wherever `<CircuitBand theme=…>` is called)
- Test: `e2e/sections.spec.ts`

**Interfaces:**
- Produces: `.hero` and `.band` render with `data-theme="dark"` regardless of the site theme. `CircuitBand` loses its `theme` prop. `Circuit` still takes `theme` until Task 4.

- [ ] **Step 1: Write the failing test** in `e2e/sections.spec.ts`, desktop and phone:

```ts
test('the circuit sections stay dark in the light theme', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'))
  for (const [path, section] of [['/', '.hero'], ['/weekend', '.weekend-page .band']] as const) {
    await page.goto(path)
    const el = page.locator(section).first()
    await expect(el).toHaveAttribute('data-theme', 'dark')
    const { bg, ink } = await el.evaluate((n) => ({ bg: getComputedStyle(n).backgroundColor, ink: getComputedStyle(n.querySelector('h1, h2, p') ?? n).color }))
    expect(bg).toBe('rgb(14, 15, 17)')
    expect(ink).toBe('rgb(242, 241, 236)')
  }
})
```

- [ ] **Step 2: Run** `bunx playwright test e2e/sections.spec.ts -g "stay dark"`. Expected: FAIL (`.hero` has no `data-theme`).
- [ ] **Step 3: Implement.** In `site.css` add `[data-theme] { color: var(--ink); }` so a themed element resolves its own text colour, and give `.hero` and `.band` `background: var(--bg)`. Set `data-theme="dark"` on both sections and drop the theme-dependent poster path (posters become `-dark` until Task 3 renames them).
- [ ] **Step 4: Run** the test, then `bunx playwright test e2e/sections.spec.ts e2e/hero.spec.ts e2e/weekend.spec.ts`. Expected: PASS. Check `TitleFight`'s existing `data-theme` figcaption is unchanged in a capture.
- [ ] **Step 5: Commit** `feat(circuits): the hero and the circuit band stay dark in the light theme`.

### Task 2: prep fetches the OSM context

**Files:**
- Modify: `blender/circuits/prep.py`
- Modify: `.gitignore` (`blender/circuits/data/*-osm.json`)

**Interfaces:**
- Produces: `blender/circuits/data/{id}-osm.json`, the Overpass `out geom` response for the track bbox plus 1.5 km: `building`, `highway` (types in the mock's `WIDTHS`), `natural=water`, `waterway=riverbank`, `leisure=park|pitch`, `landuse=grass|forest|recreation_ground|meadow`. Same local projection as `layout()`.

- [ ] **Step 1:** Add `osm(cid)` to `prep.py`: build the query from the layout bbox, POST to the mirrors in order (`overpass.private.coffee`, `overpass-api.de`, `overpass.kumi.systems`), retry each with 10/30/60 s backoff on 429/5xx/timeout, write the file, print element counts by kind. `main()` calls it only when the file is missing. `UA` is reused.
- [ ] **Step 2: Run** `python3 -I blender/circuits/prep.py <id>` for all five. Expected: five files, each with buildings > 0, highways > 0, and `git status` shows none of them.
- [ ] **Step 3: Commit** `feat(circuits): prep fetches each circuit's OpenStreetMap context`.

### Task 3: Blender bakes the broadcast circuit

**Files:**
- Create: `blender/circuits/broadcast.py` (port of the session mock `map.py`: `Local`, `map_texture`, `blocks`, `outward`, `on_ground`)
- Modify: `blender/circuits/build.py`, `blender/circuits/build.sh`
- Modify: `test/circuits/posters.test.ts`
- Delete: `public/circuits/*-light*.webp`

**Interfaces:**
- Consumes: `data/{id}-osm.json` (Task 2); `circuit.Track`, `ribbon`, `terrain`, `bar`.
- Produces, per circuit:
  - `public/circuits/{id}.glb` with meshes: `ground` (UV layer `map` into the map image, 0..1 over the map extent), `blocks`, `road` (dark slab, ribbon width 24 m), `S1`/`S2`/`S3` (core, UV `x` = lap fraction as today), `S1-halo`/`S2-halo`/`S3-halo` (UV `x` = lap fraction, UV `y` = 0..1 across the halo width), `start`; empties `turn-N`; the camera.
  - `public/circuits/{id}-map.webp` (4096 px long side) and `{id}-map-2048.webp`.
  - `public/circuits/{id}.webp` and `{id}-1440.webp` posters (Cycles, glow palette, bloom only in the poster render).
  - `src/circuits/pins/{id}.json` and `src/circuits/lines/{id}.json` as today.

- [ ] **Step 1: Write the failing test.** Rewrite `posters.test.ts`:

```ts
it('ships one dark poster pair, a map pair and a glb per circuit, each within budget', async () => {
  for (const { model } of allCircuits()) {
    const size = async (name: string) => { const f = Bun.file(`public/circuits/${name}`); expect(await f.exists()).toBe(true); return f.size }
    expect(await size(`${model}.webp`)).toBeLessThan(700 * KB)
    expect(await size(`${model}-1440.webp`)).toBeLessThan(250 * KB)
    expect(await size(`${model}-map.webp`)).toBeLessThan(600 * KB)
    expect(await size(`${model}-map-2048.webp`)).toBeLessThan(200 * KB)
    expect(await size(`${model}.glb`)).toBeLessThan(600 * KB)
    expect(await Bun.file(`public/circuits/${model}-light.webp`).exists()).toBe(false)
  }
})
```

- [ ] **Step 2: Run** `bun test test/circuits/posters.test.ts`. Expected: FAIL (no `-map.webp`).
- [ ] **Step 3: Implement** `broadcast.py` and the `build.py` changes. Road width 24 m and lip 4 m set on `circuit` before building, as the mock did; blocks ≥ 1800 m² within 420 m; labels are not in Blender (DOM pins). Keep `frame()`'s azimuth search and `FREE`/`KEEP_OUT`; lower `PITCH` to the mock's 36° and re-check the hero keep-out boxes. The glow palette starts from the mock (`bg #06080E`, `ground #0A0E18`, `minor #172033`, `major #22304C`, `water #081226`, `block #131A2B`). Export the map at 4096 and downscale to 2048 with `cwebp -resize`.
- [ ] **Step 4: Run** `sh blender/circuits/build.sh <id>` for all five, then `bun test test/circuits`. Expected: PASS; `registry.test.ts` and `fit.test.ts` still pass with the new crops.
- [ ] **Step 5: Commit** `feat(circuits): Blender bakes each circuit as a glowing ribbon on its OpenStreetMap map`.

### Task 4: The runtime draws the broadcast look

**Files:**
- Modify: `src/circuits/shaders.ts` (replace `mattify`, `groundOf`, `PALETTE`, `GROUND` and their shaders)
- Modify: `src/circuits/Circuit.tsx`, `src/home/Hero.tsx`, `src/weekend/CircuitBand.tsx`
- Test: `test/circuits/ground.test.ts` (rename to `broadcast.test.ts`)

**Interfaces:**
- Consumes: the glb mesh names and UV layout from Task 3; `{model}-map.webp` / `{model}-map-2048.webp`.
- Produces: `broadcast(scene: THREE.Object3D, map: THREE.Texture, span: number): { fills: ReadonlyArray<{ uniforms: { uTo: { value: number } } }> }`; `Circuit` props lose `theme` and gain `map: string` (the chosen URL).

- [ ] **Step 1: Write the failing test** in `test/circuits/broadcast.test.ts`: a group holding meshes named `ground`, `S1`, `S1-halo`, `blocks` gets, after `broadcast(group, texture, 100)`: `ground` a material whose `map` uniform is the texture; `S1` and `S1-halo` sharing one fill (setting `fills[i].uniforms.uTo.value` reaches both); `S1-halo` with `transparent`, `depthWrite: false`, `AdditiveBlending`; and calling `broadcast` twice returns the same materials.
- [ ] **Step 2: Run** `bun test test/circuits/broadcast.test.ts`. Expected: FAIL (`broadcast` is not exported).
- [ ] **Step 3: Implement.** Ground: unlit map plus the existing camera-distance haze toward `bg`. Core: sector colour × 1.6 where filled, sector colour × 0.25 where not, using the existing `vLap`/`uFrom`/`uTo` test. Halo: `exp(-k·(uv.y−0.5)²)` falloff × sector colour × fill state, additive. Blocks: flat dark colour with a fixed top-light shade. Lap light and trail: white. Circuit loads the map with `useLoader(TextureLoader, map)` (sRGB, anisotropy 8) next to the glb; `Hero` and `CircuitBand` pass `-map-2048.webp` when the stage is under 900 css px wide. Drop the theme effect.
- [ ] **Step 4: Run** `bun test` and `bunx playwright test e2e/hero.spec.ts e2e/weekend.spec.ts`. Expected: PASS, including the lap, fill, spin and pin tests.
- [ ] **Step 5: Commit** `feat(circuits): the circuit glows in sector colours on its map`.

### Task 5: Broadcast pins and the OSM credit

**Files:**
- Modify: `src/home/Hero.tsx`, `src/weekend/CircuitBand.tsx` (pin markup and credit), `src/styles/home.css`, `src/styles/weekend.css`
- Test: `e2e/hero.spec.ts`, `e2e/weekend.spec.ts`

**Interfaces:**
- Produces: turn pins render two-digit text ("01"…), sector pins render "S1" with a "SECTOR 1" caption; one shared credit string ending `© OpenStreetMap contributors (ODbL)`.

- [ ] **Step 1: Write the failing tests:** on `/weekend`, the first turn pin's text is `01` and `.band .credit` contains `OpenStreetMap`; on `/` the hero credit (or caption) contains `OpenStreetMap` and the T1 pin reads `01`.
- [ ] **Step 2: Run** them. Expected: FAIL (pins read `1`, no OSM credit).
- [ ] **Step 3: Implement** the tile style (dark navy tile `#2A3655`, white mono numerals, 1 px light rim) and the flat sector label style from the mock, and the shared credit.
- [ ] **Step 4: Run** the full e2e for hero and weekend. Expected: PASS, including "every pin inside" at 45°.
- [ ] **Step 5: Commit** `feat(circuits): turn pins read as broadcast tiles and the map credits OpenStreetMap`.

### Task 6: Proof and docs

**Files:**
- Modify: `DESIGN.md` (Circuits bullet and rule 4: glow replaces "no lights and no glow"; the forced-dark sections; OSM credit)

- [ ] **Step 1:** Capture the hero (desktop light, desktop dark, phone) and the band (desktop, phone) for two circuits, side by side with the approved mocks. Show Praffi before the PR. If the halo loses to the mock's bloom, raise it with Praffi as the desktop-only bloom fallback; do not add it unasked.
- [ ] **Step 2:** Update DESIGN.md.
- [ ] **Step 3: Run** `bun run lint`, `bun test`, full `bunx playwright test`. Expected: all pass.
- [ ] **Step 4: Commit** `docs(design): circuits glow on their OpenStreetMap map`.
