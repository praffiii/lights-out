# Chapter 06, The power unit: design

## Why

The menu has promised "The engine" since the first mocks, with no link (`MENU` in `src/shell/menu.ts`, `to: null`). The 2026 engine is the biggest rule change a new fan hears about: "half the power is electric", "the battery ran out on the straight", "no more MGU-H". A newcomer has no picture of what is inside the car or why a car slows at full throttle. Chapter 06 answers that: five parts, what each does, and a real pole lap where you can watch the electric push run out.

- Placement: How F1 works, Chapter 06 "The power unit". The menu's "The engine" links to it. My proposal; Praffi approved the mocks that carry it (2026-11-20).
- The bar is the same as for Chapters 01 to 05: landonorris.com and mercedesamgf1.com, and the 3D is made in Blender (DESIGN.md).
- The model is built from scratch in Blender. No licensed 2026 power-unit model exists: the Sketchfab CC BY search found only road V6s and an old V10, and CGTrader's "F1 2026 Power Unit" is royalty-free with no glb (Praffi chose "build it in Blender", 2026-11-20).

Everything below that does not come from the approved Figma frames, DESIGN.md, an earlier spec, or a Praffi decision is **my call**.

## Approaches

What the visitor does with the engine:

1. **Ride a real lap.** Scroll drives a real pole lap. Speed, rpm and gear are real (OpenF1); what the MGU-K and battery are doing is estimated from throttle and brake, and labelled so. **Praffi picked this.**
2. **Rev it.** The 2026-11-08 mock (desktop 190:380 / 191:389): hold a button to rev a still engine. Fun, but it shows no real data and teaches nothing about the battery.
3. **Take it apart.** Chapter 05 already does this for the car; doing it again would repeat a block (rule 6).

Which lap the band rides:

1. **The latest dry pole at a modelled circuit.** **Praffi picked this.** Today it is Pierre Gasly's Monza pole, 2026 Italian GP, 1:21.786. The latest pole overall (Interlagos, Lando Norris) was set on intermediates, and a wet lap shows no full-throttle fade.
2. **The latest pole, wet or dry.** Rejected for that reason.
3. **One fixed lap baked into the repo.** It freezes, which breaks "data updates itself" (Praffi, 2026-11-10).

How the engine in the band is drawn:

1. **Live 3D with the clay baked in Blender.** **Praffi picked this (2026-11-20).** This is the Chapter 05 pipeline: the light is baked into vertex colours, the scene is drawn unlit, and `clayMaterial` from `src/car/model.ts` is reused. The engine turns slowly as the lap plays, and the lit part crossfades purple as the phase changes. The engine is simple primitives, so the glb is small. It matches DESIGN.md's 3D-first rule and Praffi's "3D-first" feedback.
2. **Blender stills crossfaded.** Five lit stills × two themes. It needs no WebGL and gives the exact Cycles look, but about 2 MB of images, a fixed camera, and it reads like a slideshow.

How the page finds the lap:

1. **A new route, `GET /api/pole/latest`.** It reads the stored pole laps of the modelled circuits, picks the newest dry one that carries rpm, and returns it with its circuit id. **My call.** It reuses `PoleStore`, adds no KV key, and costs a few KV reads per request, inside the free tier. Decoding up to seven laps of about 400 rows each is well inside the Worker's CPU limit.
2. **The page fetches `/api/pole/<id>` for every modelled circuit.** Seven requests to show one lap.
3. **A pointer in the season snapshot.** The snapshot refreshes before the poles in `tools/refresh-season.ts`, so the pointer would lag an hour behind, and it couples two stores.

## Starting point: the approved Figma frames

Figma `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks":

| Frame | Node | Where |
|---|---|---|
| Desktop light | 468:1073 | x 54690, y 51782 |
| Desktop dark | 474:1082 | x 56230, y 51782 |
| Phone light | 481:1091 | board 131:2, x 11360 |
| Phone dark | 484:92 | board 135:2, x 11360 |

- Praffi approved the light desktop direction ("yes, latest dry pole, do dark and phones") and all four frames ("yes, approved") on 2026-11-20.
- These frames replace the 2026-11-08 engine mocks (190:380, 191:389, 194:398, 195:407).
- The older unbuilt mocks titled Chapter 06, 07 and 08 (for example `phone/Chapter 06` 232:20, "One move to defend") keep their content. If they are ever built, they become Chapter 07 and on.

Top to bottom:

1. **Hero.**
   - Label `How F1 works · Chapter 06 · 6 min`.
   - Nav `← 05 Inside the car · All chapters →`. "All chapters" goes to `/#start`.
   - Headline "Half fuel. / Half battery."
   - Intro: "A 1.6-litre V6 and an electric motor share the work, close to 50:50. Ride a real pole lap and watch the energy move."
2. **Full-bleed photo.** `PHOTOS.ch06`: Nico Hülkenberg, Audi R26, Melbourne 2026, Photo Yu Chu Chin · CC BY-SA 4.0.
   - Caption `01 · Nico Hülkenberg · Audi R26 · Melbourne, 2026`: "New rules, new engine makers. Audi builds its own."
   - On a phone the caption label wraps to two lines.
3. **Five parts.** See [Five parts](#five-parts).
4. **Ride a pole lap.** The signature section, in the opposite theme: tarmac on the light page, paper on the dark page. See [Ride a pole lap](#ride-a-pole-lap).
5. **What it makes.** See [The numbers](#the-numbers).
6. **The MGU-H is gone.** See [The MGU-H](#the-mgu-h).
7. **History.** Label `History`, headline "Louder, / then smarter.". Four engines, each with a year, a place line, a photo, its name, one line and a credit:

   | Year | Place | Engine | Line | Credit |
   |---|---|---|---|---|
   | 1967 | London, 2025 | Cosworth DFV | 3.0 litre V8. 155 wins. | Photo Hullian111 · CC BY-SA 4.0 |
   | 1986 | Munich, 2014 | BMW M12/13 | 1.5 litre turbo. Over 1,000 hp. | Photo Jiří Sedláček · CC BY-SA 4.0 |
   | 2001 | Maranello, 2013 | Ferrari 050 | 3.0 litre V10. Over 17,000 rpm. | Photo Morio · CC BY-SA 3.0 |
   | 2014 | Silverstone, 2019 | Mercedes PU106 | 1.6 litre V6 hybrid. Two motors. | Photo David Merrett · CC BY 2.0 |

   - The place line is where and when the photo was taken; the year is the engine's.
   - Desktop: four columns. Phone: staggered cards, 270 px wide, alternating left and right.
8. **Words from this chapter.** Nine chips, in this order: Power unit, MGU-K, MGU-H, Energy store, Turbocharger, Harvesting, Deployment, Overtake Mode, Sustainable fuel.
9. **Next: the race this weekend.** Chapter 06 is now the last chapter, so it ends with the existing `NextRace` band (`src/chapter/NextRace.tsx`), as Chapter 05 does today, with `PHOTOS.heroDark`.

## Five parts

- Label `The power unit · 2026 rules`, headline "Five parts. / One power unit.". Body: "Two engines in one: a petrol V6 and an electric motor, with a battery between them. Each part has one job."
- **The still.** The power unit exploded: a Blender clay render, three-quarter view from the front, one per theme. It is a poster with HTML pins, not a live scene. Every section is a poster, and the live engine belongs to the band.
- **The pins:**
  - Desktop: each part has a dot, a stem line with an elbow, a tag with its number, its name, and its job beside it, as in the mock.
  - Phone: a numbered tag on each part. Below the still is a list of the five parts with number, name and job, separated by hairlines.
- The pin positions come from Blender, not from guesses in the browser: the render script writes each part's anchor in image coordinates (0–1) to `src/engine/rig.json`. This is the Chapter 05 `posters` pattern.
- The phone shows a centre crop of the same still (`object-fit: cover`, 390 × 340). Its tags are placed by applying the crop to the same 0–1 anchors. **My call:** one render per theme, not a separate phone render. The parts sit inside the crop.

| # | Part | Job |
|---|---|---|
| 01 | V6 engine | 1.6 litres, six cylinders. Burns fuel for about half the power. |
| 02 | Turbocharger | Exhaust gas spins it, and it packs more air into the engine. |
| 03 | MGU-K | An electric motor geared to the crank. Pushes, or brakes and charges. |
| 04 | Energy store | The battery. It holds what the MGU-K harvests. |
| 05 | Control electronics | Sends the power between battery and motor. |

## Ride a pole lap

### What you see

- **Header:**
  - label `Ride a pole lap · <Circuit>, <year>` (today `Monza, 2026`);
  - headline "Flat out, / and slowing.";
  - a right-hand mono hint `Scroll to drive the lap · one lap, <m:ss.SSS>` (phone: `Scroll to drive the lap · <m:ss.SSS>`).
- **The stage:** the assembled power unit in 3D, with the part of the moment lit purple. Desktop: on the right, under the header. Phone: full width under the header.
- **The part list** (desktop: left column; phone: under the stage):
  - five rows, each with number, name and a mono state on the right;
  - the active row is filled purple and opens to one sentence about the moment;
  - the other rows show only their state.
- **The inset:** the circuit's own label-free poster, dark in both themes (rule 4), with a dot at the car's position. Label `<Circuit> · T<n> ahead`, where `T<n>` is the next turn by lap fraction.
- **The lap strip:**
  - a thin bar per sector, in the sector colours (`SECTORS` in `src/circuits/shaders.ts`) at 28% opacity, its length proportional to the sector time, with `S1 26.817`-style labels;
  - a solid purple bar for the part of the lap already driven, and a playhead;
  - a tick at each turn:
    - desktop: every tick labelled `T<n>`;
    - phone: the same `T<n>` labels; if they collide, the builder may thin them to every other turn.
  - The mock's turn names ("Rettifilo", "Roggia") are dropped. The registry has no turn names (only one `corner` per circuit), and they are not worth a data source.
- **Readouts:** four columns on desktop, 2 × 2 on a phone. Each has a hairline, a label, a value and a note:

  | Label | Value | Note | Source |
  |---|---|---|---|
  | Speed | `<speed> km/h` | `Peak <p> · throttle <t>%` | real |
  | Engine | `<rpm> rpm` | `Gear <g> · limit 15,000` | real |
  | MGU-K | the phase word with its arrow (below) | the phase note (below) | estimated |
  | Battery | the battery word, plus a level bar | `Estimated` | estimated |

  - `Peak` is the highest speed since the throttle last dropped below 90%. Numbers use `en-GB` grouping.
- **Footer row:**
  - `Scroll ↓ · <time> of <lap time>` (phone: on its own line);
  - a link `Explore <Circuit> in 3D →` to `/lap/<id>`.
- **Footnote under the band:** `Power unit modelled by Lights Out, simplified · Pole lap: <Driver>, <Team>, <year> <GP> · Telemetry: OpenF1 (unofficial) · MGU-K and battery state estimated from throttle and brake`.

### Phases

The estimate reads only real throttle, brake and speed. Each moment of the lap is in one phase:

| Phase | When | Lit and active row | V6 engine | Turbocharger | MGU-K | Energy store | Control electronics | MGU-K readout |
|---|---|---|---|---|---|---|---|---|
| Push | throttle ≥ 90 and not Fade | 01 V6 engine | Pushing | Spinning | Pushing | Draining · est. | Deploying | ↑ Pushing · "Up to 350 kW on top of the V6" |
| Fade | throttle ≥ 90, and speed has dropped at least 3 km/h below this run's peak | 01 V6 engine | Pushing | Spinning | Fading | Low · est. | Rationing | ↓ Fading · "The electric push runs out" |
| Brake | brake on | 03 MGU-K | Off throttle | Slowing | Harvesting | Charging · est. | Recovering | ↺ Harvesting · "Braking charges the battery" |
| Part | anything else | 01 V6 engine | Part throttle | Spinning | Waiting | Holding · est. | Balancing | – Waiting · "Waiting for full throttle" |

Open-row sentences:
- **Push:** "Flat out. Fuel and battery push together."
- **Fade:** "Flat out in <gear word>. The only push left before the brakes." The gear word comes from the real gear (`eighth`).
- **Brake:** "Braking. The motor turns into a generator and charges the battery."
- **Part:** "Feeding the power in through the corner."

All phase words and sentences are drafts for Praffi's fact-check.

- **Fade is the honest signal.** At full throttle a car should keep accelerating. When the real speed falls instead, the extra push has run out, whether the battery is empty or the MGU-K's taper is cutting in. The copy says "the electric push fades", which is true in either case. Monza 2026, Gasly: 342 → 334 km/h at full throttle before T1.
- To stop the phase flickering, a phase must hold for at least 0.3 s of lap time before it shows (hysteresis). **My call** on 0.3 s; the builder may tune it.
- **The battery bar** is a level from 0 to 1 from a small integrator: it falls while pushing, rises while braking, and holds otherwise, clamped to 0.05–1. It starts at 0.5 at the line, because the real state is unknown. It never shows a number. The battery **word** follows the phase, not the bar, so "Low" only shows when the real speed is fading. The builder tunes the rates so the bar visibly moves on every lap. The bar is decoration labelled "Estimated", and must never contradict the word.

### How it moves (my call)

- A **pinned scrub** on `useScrub`, like Chapters 02, 03 and 05. The pin is about five viewports tall, and scroll drives a damped lap time `t` from 0 to the lap time. Scroll never snaps: the lap is continuous (Praffi rejected stepped motion in the replay, 2026-11-11).
- **`useScrub` changes** (my call). Today it:
  - hard-codes the pin at `+=300%`;
  - needs a `[role="slider"]` in the section;
  - sets time to `end` under reduced motion;
  - steps between `stops` from the keyboard.

  It gains an optional options argument for the pin length and the reduced-motion rest time. Scroll only settles on a stop after a seek, so stops already drive only the keyboard and clicks. The defaults keep Chapters 02, 03 and 05 exactly as they are, and their e2e stays green unchanged. The band passes about `+=500%` and rest = `firstFrame(lap)`.
- **The lap strip is the slider:** `role="slider"`, with `aria-valuenow` as the lap time in seconds and `aria-valuetext` like `0:06.8, 336 km/h`.
  - ←/→ step from turn to turn: the stops are the turns' lap times, from `timeAt(lap, turn.u)`.
  - Clicking the strip seeks.
- At each `t`:
  - the readouts and strip show `sampleAt(lap, t)`, with rpm added;
  - the inset dot moves to `u`;
  - the phase picks the lit part and the list states;
  - the lit part crossfades to purple over about 0.25 s;
  - the engine turns slowly about its vertical axis, about 30° over the whole lap, as one continuous move.
- No drag-to-spin (Praffi turned it down twice).
- **The first frame**, shown before the pin starts and as the reduced-motion frame, is the first Fade moment of the lap (Monza: 0:06.8). If the lap has no Fade, it is the first Push moment, and the headline becomes "Flat out." **My call:** the headline never claims slowing that the lap does not show.
- **Reduced motion:**
  - no pin and no engine turn;
  - the stage shows the band still, the assembled render with the first frame's lit part, and the readouts show the first frame;
  - every list row shows its state.
- **No WebGL, or the model fails to load:** the same band still, and the lap still scrubs (the readouts, strip, inset and list all work without WebGL). A failed load adds no error text, because the still is a complete picture.
- **No lap** (the route returns 204, the fetch fails, or the lap fails to decode):
  - the header, stage and list stay, with list states from the Push phase and a static still;
  - the hint, inset, strip, readouts, footer row and the lap part of the footnote are not rendered;
  - one mono line in their place: `No pole lap to ride yet.`;
  - **no number is ever invented.**

### Loading

- three.js and the engine glb load only when the band is within about one viewport, as DESIGN.md asks. The still shows until the first frame is drawn, then fades.
- The lap is fetched at the same moment (`usePoleLap`'s `near` pattern).
- Rendering pauses off screen and in a hidden tab.

## The numbers

- Label `By the numbers`, headline "What it makes.", body "Peak power from each half. The FIA set out to split it close to 50:50."
- Four figures (desktop: 2 × 2 beside the headline; phone: 2 × 2 under it):

  | Label | Value | Unit | Note |
  |---|---|---|---|
  | V6 engine | 400 | kW | Burns advanced sustainable fuel |
  | MGU-K, electric | 350 | kW | Up from 120 kW in 2025 |
  | Engine size | 1.6 | litres | Six cylinders, one turbo |
  | MGU-H | 0 | | Dropped for 2026 |

- **Payoff row** (purple): `So` · "Together, about 750 kW. More than 1,000 hp." · `Close to half of it electric`.
- **Plus row:**
  - `Plus` · `+0.5 MJ` · "Overtake Mode: be within one second at the detection point and you get this much extra energy on the next lap.";
  - a link "How overtaking works →" to `/chapters/overtaking`.
- These are published rules, fixed in the code (see [Facts to verify](#facts-to-verify-before-ship)).

## The MGU-H

- **Photo:** `PHOTOS.ch06MguH`, the Honda RA621H from the rear. Caption: "Honda RA621H, 2021 · Honda Racing Gallery, 2025 · Liauzh · CC BY-SA 4.0".
  - A purple chip `Turbocharger · the MGU-H sat on its shaft` and a purple stem down to a dot on the turbo.
  - **My call:** the chip and dot are HTML over the photo, placed in photo coordinates. On a phone the chip is right-aligned so it fits.
- Label `2014 to 2025`, headline "The MGU-H / is gone.". Body: "For twelve seasons a second motor sat on the turbo shaft and turned exhaust heat into electricity. It was costly and hard to master, so the 2026 rules drop it. The MGU-K now does all the electric work."
- Two rows:
  - `2025 · MGU-K` · `120 kW` · `plus the MGU-H`;
  - `2026 · MGU-K` · `350 kW` in purple · `the only motor`.

## Data

### rpm, team and date on the stored pole lap

- `CarSample` gains `rpm` (OpenF1 `car_data` already returns it).
- `alignLap` carries rpm through to each row, like speed.
- `PoleLap` gains:
  - `team`, from OpenF1 `drivers` `team_name`;
  - `date`, the qualifying session's `date_start`. OpenF1 session keys do **not** grow with time: Kuala Lumpur, 2026-10-03, is 11730, higher than Las Vegas, 2026-11-21, at 11416 (`test/fixtures/openf1/sessions-2026.json`). So "newest" needs the date.
- All new fields are **optional** in the schema: old `pole:v1:*` laps without them still decode, and the key stays `pole:v1`.
- **The builder chooses the encoding:** a seventh optional row column or a parallel array. Either way, `PoleRow` users (`replay.ts`, the bands, `/lap`) keep working without changes.

### Backfill

- `refreshOne` today skips a circuit whose stored lap has the same session key.
- From now on, a stored lap **without rpm or without a date** counts as stale and is rebuilt. The first hourly run after merge rewrites the stored laps of the modelled circuits, then the skip works again.
- **If a rebuild is skipped or fails** (no rpm in OpenF1, the lap no longer lines up), the old lap stays and the next hourly run tries again. **My call:** no attempt marker. It would need a field or key only for this, and the cost of retrying is about six OpenF1 requests per stuck circuit per hour, spaced as today, against a free API. Each retry logs a warning, which shows in the season workflow's log. Such a circuit never qualifies for `/api/pole/latest`, so the band falls back to the next newest dry lap.
- **Blast radius:** this writes production KV (`pole:v1:<id>` for every modelled circuit) on the first run after merge, about 7 × 6 OpenF1 requests, spaced as today. It is additive: the same keys, with more fields.

### `GET /api/pole/latest`

- New file route `src/routes/api/pole.latest.ts`. A static segment wins over `pole.$circuit`; the builder confirms with a test.
- It reads every modelled circuit through `PoleStore`, keeps laps that are dry and have rpm, a team and a date, and picks the newest by `date`. On a tie, `MODELLED` order decides.
- **200:** `{ circuit: <id>, lap: PoleLap }`, with `cache-control: public, max-age=300`, like `/api/pole/<id>`.
- **204** when nothing qualifies.
- A corrupt stored lap is skipped, as `PoleStore.read` already does.
- **My call:** the selection is a pure function, `latestDry(laps)`, tested without KV.

### On the page

- `src/engine/use-latest-pole.ts`, like `use-pole-lap.ts`, decodes the response.
- The circuit facts the band shows come from `circuitFor(circuit)`:
  - name;
  - GP name;
  - turn laps (`laps`) for the ticks and "T<n> ahead";
  - the bare poster and its projected line for the inset.

### The inset dot

- The dot needs the 2D position of lap fraction `u` on a label-free poster of the circuit. Only Monza has a label-free poster today (`blender/circuits/build.py` renders `-bare` only for circuits with `marks`), and any modelled circuit can become the live lap: Las Vegas qualifies on 2026-11-21.
- **My call:** a new script, `blender/circuits/inset.py`, run on each circuit's saved `.blend` (all seven are in the repo), the way `turn_laps.py` works. It:
  - hides the label objects and renders `public/circuits/<model>-inset.webp`, a small label-free poster under 80 KB;
  - projects the racing line through the same camera and writes `src/circuits/insets/<model>.json`, a list of `[u, x, y]` in poster coordinates (0–1).
- It writes only these new files. It does **not** rebuild the circuits: no map, glb, poster, pins or line that feeds `/tracks`, Home, the weekend bands or `/lap` changes, and no OpenStreetMap data is fetched.
- The page interpolates along the projected line, wrapping at `u = 1`.

## The model (Blender)

The model follows DESIGN.md's 3D rule: a `bpy` pipeline in the repo, a `.blend` Praffi can refine, a glb for three.js, and posters from the same cameras.

### Source

`blender/engine/engine.py`, ported from `lights-out-private/engine-2026-11-20/engine.py`, with its comments removed. It builds a generic, simplified 2026 power unit, not any maker's:
- the V6 is two banks at 90°, with trumpets, coils, cam covers and exhaust primaries;
- the turbocharger is a turbine and compressor on one shaft, with a boost pipe and tailpipe, and no MGU-H;
- the MGU-K is geared to the crank;
- the energy store holds cell modules;
- the control electronics are a finned case.

The parts are named exactly as in the table under Five parts.

### Bake

A port of `blender/car/bake.py`: Cycles bakes ambient occlusion and the key light into vertex colours, as single channels.
- The band only shows the engine assembled, so it needs one bake, not two. The second channel stays free.
- Each part is a node `part:<id>`, with ids `v6`, `turbo`, `mguK`, `energyStore`, `electronics`.
- Clay colours per tone (body, carbon, metal, dark) come from the mock palette:
  - light: `#D6D4CD`, `#8F9298`, `#A6A8AD`, `#4A4D53`;
  - dark: `#5E6168`, `#3C3F45`, `#7E8188`, `#26282D`.
- The tone sits in the node name, as `clayOf` reads `_tyre` today. Lit parts turn sector purple, except their dark-tone pieces.

### Export

- `public/engine/engine.glb` (meshopt, 16-bit positions, no normals, no textures), through `@gltf-transform/cli`.
- **Budget:** at most 400 KB, measured.

### Stills

Blender renders from the scene's cameras into `public/engine/`, WEBP, each under 200 KB:
- `exploded-{light,dark}` for Five parts, at 2880 × 1800;
- `band-{light,dark}`: the assembled engine with the first frame's lit part (V6), for the band's poster, reduced motion and no WebGL;
- the band's opposite theme: `band-light` sits on the dark page's paper band, edge-faded into `#F4F3EF`, as in the mock; `band-dark` sits on `#0E0F11`.

### Rig

The render script also writes `src/engine/rig.json`:
- the lens;
- the band camera's position and target;
- the turn axis;
- the Five-parts pin anchors in 0–1 image coordinates;
- the shadow plane.

### Build script

`blender/engine/build.sh` rebuilds everything, like `blender/car/build.sh`.

### Sharing with Chapter 05

`clayMaterial`, the shadow material and `SECTOR_PURPLE` move from `src/car/model.ts` to `src/three/clay.ts`, and both chapters import them. **My call.** Move them only if the engine scene really needs them, rather than copying.

### Checkpoint (Praffi)

After the first bake, before the band is wired, Praffi sees the live glb beside the Cycles still in both themes on a throwaway page, as Chapter 05 did. Praffi's verdict gates the rest of the 3D work. To keep a failure cheap, the data work (rpm, backfill, the route) and the non-3D sections are built first.

## Words

`powerUnit` and `overtakeMode` already exist. Seven new `WORDS` entries (my call on the definitions; Praffi fact-checks):

- `mguK`: MGU-K. The electric motor on the crankshaft. It pushes the car, and under braking it turns into a generator.
- `mguH`: MGU-H · until 2025. A motor on the turbo shaft that turned exhaust heat into electricity. Gone in 2026.
- `energyStore`: Energy store. The battery. It holds the electricity the MGU-K harvests.
- `turbocharger`: Turbocharger. A fan spun by exhaust gas that packs more air into the engine.
- `harvesting`: Harvesting. Turning braking into electricity for the battery.
- `deployment`: Deployment. Spending the battery's energy through the MGU-K to push the car.
- `sustainableFuel`: Sustainable fuel. From 2026, fuel made without new fossil carbon.

`POWER_WORDS` holds the nine chips in the mock's order.

Inline terms (my call):
- **Five-parts jobs:** `turbocharger` (02), `mguK` (03), `energyStore` (04).
- **MGU-H body:** `mguH`.
- **Numbers note:** `sustainableFuel`.
- **Band footnote:** none. Mono lines carry no terms.

`harvesting` and `deployment` appear only as chips. The band's phase words are mono state labels, not prose.

## Wiring the guide in

- **Route:** `/chapters/power-unit`, file `src/routes/chapters.power-unit.tsx`.
  - Head title `The power unit · Lights Out`, and a one-line description.
  - Stylesheets `chapterCss` + `engineCss`.
  - **My call** on the slug.
- **Page:** `src/chapter/PowerUnit.tsx` + `src/styles/engine.css`, following `Car.tsx`.
- **3D and data code:** `src/engine/` (the scene, the rig, the phases, the hook).
  - The phases are a pure module: `phaseAt(lap, t)`, `batteryAt(lap, t)`, `firstFrame(lap)`.
- **`CHAPTERS`** gains `{ n: '06', title: 'The power unit', min: 6, photo: PHOTOS.ch06, to: '/chapters/power-unit' }`. Home's chapter list and the menu's chapter list grow to six.
  - Home's hard-coded `Five chapters · 30 min` (`src/home/Home.tsx`) becomes `Six chapters · 35 min`, derived from `CHAPTERS` (count and summed minutes). The two Home e2e checks that assert five chapters change to six.
- **Menu:** `The engine` → `to: '/chapters/power-unit'`. Its photo stays `PHOTOS.brm`.
- **Chapter 05 is no longer last:**
  - its hero nav gains the Chapter 06 link, in the pattern Flags uses;
  - its `NextRace` band becomes a `Next` card: `Next · Chapter 06 · 6 min`, "The power unit.", line "Half fuel, half battery, one real pole lap", `PHOTOS.ch06`, to `/chapters/power-unit`.
- **Images:**
  - `public/img/ch06.jpg` (the Audi), `ch06-mguh.jpg`, and `ch06-1967.jpg` … `ch06-2014.jpg`, about 1400 px wide;
  - each has a `PHOTOS` entry with its Commons `source`, and appears on the credits page as the others do.
- **Credits:** the band footnote names OpenF1. The model is Lights Out's own, with no licence to credit.

## Rules that apply

- **The 7 rules (DESIGN.md):**
  - every section is a poster;
  - the pole-lap band is the one dense widget;
  - every photo has a caption block or place line plus its credit;
  - the circuit inset is the glowing road on dark;
  - one ease family;
  - no text-only section;
  - the signature section is in the opposite theme.
- **3D:** made in Blender; matte clay, no glow; the stills match the live end frame.
- **No charts, no synthesized sound.** The readouts are numbers and words. The battery bar is a single level, not a chart.
- **Code:** no code comments (Python included); no `as` casts except `as const`; no `any`; no non-null `!`. `bun run lint` passes.
- **Copy:**
  - never invent numbers;
  - every number is either real telemetry from the stored lap or a published rule;
  - every estimate says "est." or "Estimated".
- **Media:** Commons CC0, CC BY, CC BY-SA or public-domain photos; no F1, FIA or team logos as graphics.
- **Zero cost:** one new Worker route, no new KV keys, no paid services.

## Facts to verify before ship

- **Power:** about 400 kW from the V6 and 350 kW from the MGU-K. 120 kW in 2025. Together about 750 kW, over 1,000 hp. "Close to 50:50."
- **Overtake Mode:** +0.5 MJ, within one second at the detection point, used on the next lap. Chapter 02 never gives a figure: it says the detection point "unlocks" it (`words.ts`, `Overtaking.tsx`). Chapter 02's copy changes in this PR only if the fact-check finds it contradicts this.
- **Rev limit:** 15,000 rpm in 2026.
- **Fuel:** "advanced sustainable fuel" is the 2026 term, and "made without new fossil carbon" is a fair one-line definition.
- **Audi:** "Audi builds its own" (its own power unit, from Neuburg).
- **MGU-H:** "for twelve seasons" (2014–2025), and dropped for 2026.
- **History:**
  - DFV 155 wins;
  - BMW M12/13 over 1,000 hp in qualifying trim;
  - Ferrari 050 over 17,000 rpm;
  - PU106 "two motors" (MGU-K and MGU-H);
  - each photo's place, year and licence on its Commons page.
- **The lap:** Monza 2026 pole, Pierre Gasly, Alpine, 1:21.786, and the 342 → 334 km/h fade before T1.
- **Phase words and sentences:** whether "Deploying", "Rationing", "Recovering" and "Balancing" are fair simplifications for the control electronics.
- **Photo sources:** find each Commons file by its credit, and confirm licence and author before download.

## Proof before PR

- **Blender:**
  - `blender/engine/build.sh` rebuilds the glb, rig and stills from `engine.py`;
  - the glb is within budget;
  - Praffi has passed the checkpoint.
- **Fixtures:**
  - The Monza OpenF1 car fixture (`test/fixtures/openf1/pole/11357-car.json`) is the only car fixture without rpm. It is re-captured with rpm, once, through the existing tools (UA and 2 s spacing as always).
  - A committed pole-lap fixture for Monza (`test/fixtures/pole/monza.json`) is built from it by the real `poleLap` path. The e2e serves it from `/api/pole/latest`.
  - The e2e first-frame numbers are read from that fixture, not assumed. The mock's `336 km/h · 11,520 rpm · Gear 8` at 0:06.8 is what the fixture is expected to show.
- **Unit tests** (`test/engine/`, `test/pole/`):
  - `phaseAt`: each phase from crafted rows (Push; Fade only after a 3 km/h drop at full throttle; Brake; Part); the 0.3 s hysteresis; a lap with no Fade;
  - `firstFrame` is the first Fade, or else the first Push;
  - `batteryAt` falls in Push, rises in Brake, holds in Part, and stays within 0.05–1;
  - `latestDry`: skips wet laps, laps without rpm, without a team and without a date; picks the newest `date`, even when an older lap has a higher `sessionKey`; returns null when none qualify;
  - `alignLap` carries rpm; a 6-column lap still decodes;
  - `refreshOne` rebuilds a stored lap without rpm or date, skips one that has them and the same session, and keeps the old lap when the rebuild is skipped;
  - `useScrub` with no options behaves as today (Chapters 02, 03 and 05 e2e unchanged);
  - the strip slider: ←/→ move turn to turn;
  - `/api/pole/latest` returns 200 with circuit and lap, 204 with nothing, and is not caught by `pole.$circuit`;
  - the projected-line interpolation puts `u = 0` on the line's first point and wraps at 1.
- **e2e** (`e2e/power-unit.spec.ts`, desktop and phone):
  - loads in both themes; no horizontal overflow at 1440 and 390; every photo credited;
  - Five parts shows five pins (desktop) or five tags and five rows (phone);
  - the band is in the opposite theme in both themes;
  - with the fixture lap:
    - the first frame reads `336 km/h`, `11,520 rpm`, `Gear 8`, `↓ Fading` and `Low`;
    - scrolling into a braking zone flips the active row to 03 MGU-K and `Harvesting`;
  - the WebGL canvas draws (non-blank pixels); with WebGL disabled, the still shows and the lap still scrubs;
  - reduced motion: no pin, the first frame shown;
  - `/api/pole/latest` returning 204 shows `No pole lap to ride yet.` and no numbers in the band;
  - the menu's "The engine", Home row 06 and Chapter 05's Next card lead here; Chapter 06 ends with the weekend band.
- **Checks:** `bun test`, `bun run lint` and `bunx playwright test` are green.
- **Live:** scroll the lap in the browser at 1440 and 390, both themes.
- **Review:** sol-loop, then the `pr` skill for the body.

## Left to the builder

- The engine's turn angle, the camera, and the pin length of the scrub.
- The battery integrator's rates, within the rules above.
- The rpm encoding in the stored lap.
- How the projected line is sampled (point count) in `inset.py`, and the inset poster's size.
- Type sizes between the mock values and the viewport.
