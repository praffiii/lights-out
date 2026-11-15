# Chapter 05, Inside the car: design

## Why

Home row 05, the menu and Chapter 04's hero nav and Next card already promise "Inside the car" with `Soon`, and the card's line is "What every part of a 2026 car does". Chapter 05 answers the question a new fan has when the broadcast says "front wing damage" or "the floor is broken": what are the parts of the car, and what does each one do? It is the longest chapter (8 min) and the last in the guide.

The chapter takes the place of the separate "The car" page in spec §7.2: the anatomy pattern (a real object, one part lit, taken apart by the visitor) lives here, and there is no separate car page later (Praffi, 2026-11-15).

The bar is the same as for Chapters 01 to 04: landonorris.com and mercedesamgf1.com (Praffi, 2026-11-15). Everything that is 3D is made in Blender (Praffi, 2026-11-15, repeating DESIGN.md's rule).

Everything below that does not come from the approved Figma frames, DESIGN.md, `docs/motion-map.md` or an earlier Praffi decision is **my call**.

## Approaches

Which chapter 05 is. Figma held two:

1. **"Inside the car"**, from the approved "The car" mock (166:20). This is what the site already promises. **Praffi picked this.**
2. **"Penalties and track limits"** (105:2), an older mock. Chapter 04 already teaches the track-limits strikes, so most of it is spent. The penalty ladder (5 s up to a race ban) is not covered anywhere and could be a later chapter.

How the car is drawn and moved in the browser. The approved stills are Cycles clay renders; MaG80's model is 206k triangles and 8.9 MB:

1. **Live 3D with the clay shading baked in Blender.** Blender splits the car into the eight parts, slims it, bakes the clay light into vertex colours and exports one meshopt glb. The page draws it unlit: scroll takes it apart, the camera glides part to part, the lit part turns purple, and the same model opens the wing flaps. Blender stills from the same cameras are the fallback. **Praffi picked this ("A").**
2. **Live 3D with real-time lights.** Simpler, but three.js lighting reads flatter and more plastic than the Cycles stills, and the model needs normals.
3. **Pre-rendered Blender frames scrubbed by scroll.** The exact look with no WebGL, but about 10–20 MB of frames for eight parts in both themes, with a fixed camera.

How the top speed reaches the page:

1. **A new optional `topSpeed` field on the season snapshot**, built by the hourly refresh beside `flags`, frozen per race after 48 hours. **My call.** It is the Chapter 04 pattern: no new route, KV key or hook.
2. **A number baked into the repo.** It freezes at Mexico City, which breaks "data updates itself" (Praffi, 2026-11-10).

## Starting point: the approved Figma frames

Figma `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks":

| Frame | Node | Where |
|---|---|---|
| Desktop light | 394:857 | x 34080 |
| Desktop dark | 398:866 | x 35620 |
| Phone light | 400:74 | board 131:2, x 8540 |
| Phone dark | 400:284 | board 135:2, x 8540 |

Approvals:

- Praffi approved the light desktop direction on 2026-11-15 ("yes").
- Praffi signed off the dark and phone frames ("ok good").

Top to bottom:

1. **Hero.**
   - Label `How F1 works · Chapter 05 · 8 min`.
   - Nav `← 04 Flags and what they mean · All chapters →`. "All chapters" goes to Home's "Start here" chapter list (`/#start`, the id of its heading).
   - Headline "Eight parts. / One car."
   - Intro: "Every car on the 2026 grid is built from the same eight parts. Take one apart and each part has one job."
2. **Full-bleed photo.** `PHOTOS.ch05`: Oscar Piastri, McLaren MCL40, Suzuka 2026, Photo Martin Lee · CC BY-SA 4.0.
   - Caption `01 · Oscar Piastri · McLaren MCL40 · Suzuka, 2026` (phone: `01 · McLaren MCL40 · Suzuka, 2026`): "Eleven teams, one rulebook, the same eight parts."
3. **Take it apart.** The signature section, in the opposite theme: tarmac on the light page, paper on the dark page. See [Take it apart](#take-it-apart).
4. **Smaller for 2026.**
   - Label `Smaller for 2026`. The giant number `1,900` with "mm wide" and "100 mm narrower than 2025. / Shorter and lighter too."
   - The top view of the car, a Blender still in each theme, with dimension lines `3,400 mm` (wheelbase) and `1,900 mm` (width) drawn in HTML/CSS over it.
   - A 2025 → 2026 ladder (big-type rows with hairlines, no purple):

     | Row | 2025 | 2026 | Change |
     |---|---|---|---|
     | Wheelbase | 3,600 mm | 3,400 mm | −200 mm |
     | Minimum mass | 800 kg | 768 kg | −32 kg |
     | Front tyre | 305 mm | 280 mm | −25 mm |
     | Rear tyre | 405 mm | 375 mm | −30 mm |

   - On a phone the top view turns nose-up (the phone still), and each row shows the 2026 value large with `−200 · was 3,600` on the right.
5. **Wings that move.** See [Wings that move](#wings-that-move).
6. **History.** Label `History`, headline "Every era found / grip somewhere new.", a three-photo collage at staggered heights, each with a place line, a one-line caption and a credit:
   - `Zandvoort, 1950`: "Engine in front. No wings." Photo Nationaal Archief · CC0. Commons `START, autoraces, Bestanddeelnr 904-0841.jpg` (3243 × 2532).
   - `Zandvoort, 1978 · Lotus 79`: "The floor becomes a wing." Mario Andretti leads Ronnie Peterson · Photo Koen Suyk / Anefo, Nationaal Archief · CC0. Commons `Grand Prix Zandvoort Mario Andretti op kop met daar achter Ronnie Petterson, Bestanddeelnr 929-8743.jpg` (3688 × 2445).
   - `Suzuka, 2026 · Mercedes W17`: "The wings move." Kimi Antonelli · Photo Martin Lee · CC BY-SA 4.0. Commons `Mercedes W17 - Kimi Antonelli approaches Spoon Curve at Suzuka during the 2026 Japanese GP (55194289192).jpg` (2949 × 2084).
   - The 1950 and 1978 photos are older on purpose: the moment itself is historic.
   - **My call on 1978:** the mock's Brands Hatch photo exists on Commons only at 550 and 612 px wide, too soft for a 2× screen. The Zandvoort shot is CC0, 3688 px, the same year and car, and black-and-white from the same archive as 1950, so the two old photos read as a pair.
7. **Words from this chapter.** Nine chips, in this order: Survival cell, Halo, Sidepod, Floor, Ground effect, Power unit, Active aero, Straight Mode, Overtake Mode.
8. **Next: the race this weekend.** Chapter 05 is the last chapter, so the Next band leads to the race weekend instead. See [The Next band](#the-next-band).

## Take it apart

### What you see

- Header: label `The car · 2026 rules`, headline "Take it apart.", and a right-hand mono line `Scroll to take it apart · one part at a time` (phone: `Scroll to take it apart`).
- **The stage:** the car in 3D, exploded, three-quarter view from the front left (the mock's camera). Small mono tags `01`–`08` sit on each part. The current part is lit sector purple and carries a pin with a stem and a chip `01 · Front wing`.
- **The part list** on the left (under the stage on a phone): eight rows with number, name and a mono fact on the right. The current row is filled purple and opens to its one-line job.
- Under it: an eight-step progress rail (the current step purple) and `Scroll ↓ · Part 01 of 08` on the right. The phone shows the rail and `Part 01 of 08`.
- A credit line under the band: `3D car by MaG80 · CC BY 4.0 · a fan design to the 2026 rules, not any team's car · front and rear wing flaps move`.

### The parts

| # | Part | Fact | Job (the open row) |
|---|---|---|---|
| 01 | Front wing | 2 flaps | Two flaps that open on the straights and close for the corners. |
| 02 | Survival cell | Carbon tub | The carbon shell the driver sits in. It must pass the FIA crash tests before it can race. |
| 03 | Halo | Titanium | A titanium hoop over the cockpit that keeps flying wheels and debris off the driver's head. |
| 04 | Sidepods | Radiators | Air goes in at the front to cool the radiators packed inside. |

**My call:** the engine cover belongs to 04 Sidepods (it is one bodywork piece on the car) and lifts with them, which uncovers 06 Power unit.
| 05 | Floor | Most grip | Air rushing under the car pulls it onto the track. The floor makes most of the grip. |
| 06 | Power unit | 350 kW | A 1.6-litre V6 turbo plus a 350 kW electric motor. Close to half the power is electric. |
| 07 | Rear wing | Flap opens | Its flap opens on the straights to cut drag, and closes for the corners. |
| 08 | Tyres | 18 in | 18-inch Pirelli tyres, narrower for 2026. Chapter 03 has the compounds. |

The facts and jobs are drafts for Praffi's fact-check (see [Facts to verify](#facts-to-verify-before-ship)).

### How it moves (my call)

- The band is a **pinned scrub**, built on the existing `useScrub` hook with eight stops, like Chapter 02's replay and Chapter 03's undercut: one viewport-tall pin, the scroll drives a damped time `t` from 0 to 1, and a stop settles on each part.
- Over the first stretch of scroll the car comes apart (assembled → exploded). Then each stop lights one part: the camera glides to frame it, the part turns purple, the list row opens, the pin moves to it, and the rail fills.
- The camera is one continuous move between per-part framings, never a cut (Praffi's replay feedback, 2026-11-11). There is **no drag-to-spin**: Praffi turned it down on the lap explorer ("looks awful") and the pole band ("so normal").
- Tapping or clicking a row, or pressing ↑/↓ on the focused list, scrolls to that part's stop, the way the replay's turn chips do.
- **Idle:** before the visitor scrolls into the pin, the assembled car turns slowly on its spot. It stops the moment the pin starts. **My call** on the idle, from spec §7.2 ("an idle animation runs until the visitor touches it").
- **Reduced motion:** no pin and no camera moves. The stage shows the exploded poster still; the list is a normal list where every row shows its job, with no purple fill.
- **No WebGL, or the model fails to load:** the exploded poster still from the same camera, with the list working as in reduced motion. A failed load keeps the poster with "The 3D car could not load.", like the lap explorer.

### The model (Blender)

The model follows DESIGN.md's 3D rule: a `bpy` pipeline in the repo, a `.blend` Praffi can refine, a glb for three.js, and posters from the same cameras.

- **Source.** MaG80's "My take on the 2026 f1 regulations" (Sketchfab, CC BY 4.0). The raw download stays out of the repo, like the raw OSM data. `blender/car/build.sh` reads it from `$MAG80` (default `../lights-out-private/car-mag80/scene.gltf`).
- **Prep.** `blender/car/prep.py` is ported from the 2026-11-08 pipeline (`lights-out-private/pipeline-2026-11-08/mag/prep.py`), with its comments removed (the repo bans comments):
  - it puts the car in a metre frame, nose +x, rear axle at x 0, ground at z 0;
  - it splits the body into loose islands, sorts them into the eight parts by position, and joins each part;
  - thin rods and wishbones go into a hidden `Suspension` group that never shows when the car is apart;
  - it joins the engine cover to Sidepods;
  - it adds the simple power unit inside the engine cover (MaG80's car has none);
  - it tags the front and rear wing flaps with their pivot (leading edge) and their Straight Mode angle (front −15°, rear −35°).
- **Slimming.** Decimate to about 100k triangles in total. Wing and halo edges must stay crisp; the floor and survival cell take most of the cut. **Budget:** the glb is at most 1.6 MB after meshopt, measured.
- **Baked clay.** Cycles bakes ambient occlusion and the soft key light of the mock stills as plain light values (no colour), twice: once with the car assembled and once exploded, so the inside faces that show when apart are lit right. **My call:** the two bakes are single channels packed into one vertex-colour attribute; the page blends between them as the car comes apart and multiplies by the theme's clay colour, a uniform. One glb serves both themes. A small soft ground-shadow texture under the car is allowed.
- **Export.** One `public/car/car.glb` (meshopt, 16-bit positions, no normals, no textures), through `@gltf-transform/cli` like the circuits. Each part is a named node `part:<Part>`; flaps are their own nodes with their pivot as the node origin. The explode offsets and the per-part camera framings are exported as data, not guessed in the browser: `src/car/parts.json` holds, per part, its explode offset, its tag and pin anchor, and the camera position and target for its stop. **My call** on JSON beside the glb, like `src/pins.json` for circuits.
- **Posters.** Blender renders, from the scene's own cameras:
  - `exploded-{light,dark}` at desktop and phone framing (the reduced-motion and no-WebGL stills);
  - `top-{light,dark}` (desktop: nose left; phone: nose up);
  - `side-{light,dark}` with flaps open (the Wings fallback).

  They are WEBP in `public/car/`, sized like the existing posters, each under 200 KB.
- **The look in three.js.** Unlit: the baked light times the theme's clay colour; the lit part swaps to sector purple multiplied by its own baked light, so it keeps its shading. The wheel and tyre faces keep their darker clay. No bloom, no glow, no real-time lights. The page matches the posters, so the poster-to-3D swap is invisible.
- **Checkpoint (Praffi).** After the first bake, before the scene is wired into the page, Praffi sees the live glb beside the Cycles still in both themes (a throwaway page, like the broadcast circuits' Task 3). Praffi's verdict gates the rest of the 3D work.
- **If the checkpoint fails (my call on the order):** first raise the triangle budget or bake to a lightmap texture instead of vertex colours. If that still fails, Praffi chooses between the earlier B (Blender stills only) and C. To keep that cheap, the non-3D parts and the top-speed data are built first, and the 3D work comes after.

### Loading

- three.js and the glb load only when the band comes within about one viewport of the screen, as DESIGN.md asks. The poster shows until the first frame is drawn, then fades.
- The Wings section reuses the same loaded glb (one download, one parse), drawn in its own small scene.
- The band pauses rendering when off screen and in a hidden tab.

## Wings that move

- Label `Active aero`, headline "Wings that move.", body "Both wings have flaps that move. Closed in the corners for grip, open on the straights to cut drag."
- **The switch:** two tabs over a hairline, `Corner Mode · flaps closed · more grip` and `Straight Mode · flaps open · less drag`. The active tab is ink with an ink underline (no purple here; purple is the flaps).
- **The car:** the same glb from the side, assembled, both wings' flaps lit purple. Scrolling through the section opens the flaps from Corner Mode to Straight Mode (rotating each flap about its pivot to its Straight Mode angle), and the switch follows. Clicking a tab moves to that state. **My call:** a plain scroll-linked tween, no pin.
- **The number (desktop: left of the car; phone: under it):** label `Top speed, <season>`, the giant `<kmh>` with `km/h`, the line "Car <n>, <Surname>, through the <circuit> speed trap on lap <lap>. Flaps open." and the source `OpenF1 speed traps · updates after every race`.
- **The payoff row (purple):** `So` · "Every car gets Straight Mode on the straights." · `Overtake Mode is the chaser's extra`. The right-hand part links to Chapter 02 (`/chapters/overtaking`), which teaches Overtake Mode.
- **Reduced motion and no WebGL:** the `side` still with flaps open, the switch set to Straight Mode, the tabs still clickable but nothing animates.

## Live top speed

The number has to update itself. It rides the hourly season workflow, which already reads OpenF1 (Praffi, 2026-11-10).

### Data

`SeasonSnapshot` gains `topSpeed: Schema.optionalKey(TopSpeed)`. Old snapshots without it still decode.

`TopSpeed` holds:
- `season`: number;
- `races`: one row per finished, uncancelled Grand Prix, oldest first: `sessionKey`, `circuit` (OpenF1 `circuit_short_name`), `dateEnd`, `kmh`, `driverNumber`, `surname` (OpenF1 `last_name`), `lap`.

### Rules

- **The reading.** A race's row is its highest `st_speed` (the speed trap) over all laps in the race session. A lap with no `st_speed` is skipped. On a tie, the earlier lap wins.
- **The season's number** is the highest row; on a tie, the earlier race. Today that is 361 km/h, car 10, Gasly, Mexico City, lap 48 (car 50 also reached 361, on lap 65).
- **Which sessions.** The same as the flag tally: `session_name` `Race`, not cancelled, finished 30 minutes after `date_end`. The same season fallback: before the first race, last season's.
- **Requests.** Per new race, one `laps?session_key=<k>` (all drivers) and one `drivers?session_key=<k>`. `OpenF1Client` gains a `sessionLaps(key)` reader with its own small schema (`driver_number`, `lap_number`, `st_speed`), through the existing gate and spacing.
- **Freeze.** A race whose `date_end` is under 48 hours old is fetched every hour; after that its row is carried forward from the previous snapshot. Reuse `finishedRaces` and `frozen` from `src/flags/tally.ts` (move them to a shared module if the import reads wrong; builder's call).
- **Failure.** Any OpenF1 failure or a 60-second timeout keeps the previous `topSpeed`, or omits the field. It never fails the snapshot, as the flag tally behaves.

### On the page

- **No data** (loading, a failed fetch, or a snapshot without `topSpeed`): the number block renders without the number, unit, line or source. Its space stays reserved, so nothing jumps. **No number is ever invented.**
- Numbers use `en-GB` grouping.

## The Next band

The shared `Next` component gets a variant for the last chapter (**my call** on a prop rather than a second component; the builder may split it if the prop reads badly):

- Label `Next · Round <n> · <when>`, where `<when>` is the menu's existing `RACE_WHEN` phrase (`this weekend`, `next race`, `season finale`), from the same snapshot calculation the menu uses.
- Headline `<Place>,` / `<when>.`, where `<Place>` is the race's `locality` from the calendar. Today: "Las Vegas, / this weekend." **My call:** the mock's "under the lights." only fits night races, so the second line is the same `<when>` phrase every week rather than a per-race list.
- Link "Times, the track and the pole lap →" to `/weekend`.
- Photo: `PHOTOS.heroDark` (McLaren MCL39, Las Vegas 2025, Photo DHSgov, public domain), with its own place line as the credit. **My call:** the photo is fixed. Its caption names its own place and year, so it stays honest when the next race is somewhere else.
- **Which race (my call):** the same race the menu shows. If that race has finished (its weekend closed before now) and the calendar has none after it, or there is no snapshot, the band falls back to "All chapters" with the Home chapter list link (`/#start`) and the same photo, so the page never shows a broken label. Between seasons, once next season's calendar is in the snapshot, Round 1 shows as `next race`.

## Words

`activeAero`, `straightMode` and `overtakeMode` already exist in `src/chapter/words.ts` from Chapter 02 and are reused as they are. Six new `WORDS` entries, my call on the definitions:

- `survivalCell`: Survival cell. The carbon tub the driver sits in, built to survive a crash.
- `halo`: Halo. The titanium hoop over the cockpit that protects the driver's head.
- `sidepod`: Sidepod. The bodywork on each side of the driver. It feeds air to the radiators.
- `floor`: Floor. The flat underside of the car. Air under it pulls the car down.
- `groundEffect`: Ground effect. Grip made by air flowing fast under the car, sucking it onto the track.
- `powerUnit`: Power unit. The engine and its electric motor and battery, working as one.

`CAR_WORDS` holds the nine chips in the mock's order.

Inline terms (my call):
- **Intro:** none.
- **Part jobs:** `survivalCell` (02), `halo` (03), `sidepod` (04), `floor` and `groundEffect` (05, "pulls it onto the track"), `powerUnit` (06).
- **Wings body:** `activeAero`.
- **Payoff row:** `straightMode`, `overtakeMode`.

## Wiring the guide in

- **Route:** `/chapters/inside-the-car`, file `src/routes/chapters.inside-the-car.tsx`. Head title `Inside the car · Lights Out` and a one-line description. Stylesheets `chapterCss` + `carCss`. **My call** on the slug, which matches the title.
- **Page:** `src/chapter/Car.tsx` + `src/styles/car.css`, following the `Flags.tsx` pattern (`chapter-page car-page`, `.opening`, `.photo-band`, `Words`, `Next`).
- **3D code:** `src/car/` (the scene, the part data and the loader). It shares nothing with `Circuit.tsx` except the meshopt loader setup, which moves to a small shared helper if both need it.
- **Links into the chapter:**
  - `CHAPTERS[4].to = '/chapters/inside-the-car'`, which lights up Home row 05 and the menu (five linked chapters);
  - Chapter 04's hero nav `Soon` becomes `Go`;
  - Chapter 04's Next card gets `to="/chapters/inside-the-car"`.
- **Images:** `public/car/*.webp` from Blender; the history photos are the Commons files named under History, saved as `public/img/ch05-1950.jpg`, `ch05-1978.jpg`, `ch05-2026.jpg`, about 1400 px wide, each with a `PHOTOS` entry.
- **Credits:** MaG80's CC BY credit sits under the band (above) and wherever the site lists its sources.
- **Docs:** DESIGN.md's "The car" 3D bullet is rewritten to say the car is MaG80's model split by `blender/car`, shown in Chapter 05; spec §7.2 and §8 note that the car page is Chapter 05.

## Rules that apply

- **The 7 rules (DESIGN.md):**
  - every section is a poster;
  - the take-apart is the one dense widget;
  - every photo has a caption block or place line plus its credit;
  - no circuit on this page;
  - one ease family;
  - no text-only section;
  - the signature in the opposite theme.
- **3D:** made in Blender; matte clay, no glow; posters match the 3D end frame.
- **Code:** no code comments (Python included); no `as` casts except `as const`; no `any`; no non-null `!`. `bun run lint` (oxlint anti-slop, tsc, no_comments.py) passes.
- **Copy:** never invent numbers; every number on the page comes from the snapshot or is a published rule.
- **Media:** Commons CC0, CC BY, CC BY-SA or public-domain photos; MaG80's model under CC BY 4.0; no F1, FIA, Pirelli or team logos as graphics. Logos inside a photo of a real scene are fine.
- **Zero cost:** no new Worker routes, KV keys or paid services. The refresh adds two OpenF1 requests per new race.

## Facts to verify before ship

- **Sizes.** 2026: width 1,900 mm, wheelbase at most 3,400 mm, minimum mass 768 kg. 2025: 2,000 mm, 3,600 mm, 800 kg. Source: the FIA 2026 technical regulations and its 2024 launch summary.
- **Tyres.** 2026 fronts 25 mm narrower and rears 30 mm narrower, still 18-inch. Confirm the 2025 base widths (305 / 405 mm) against Pirelli.
- **Front wing flaps.** Two moving elements on the front wing (the "2 flaps" fact). If it is one flap, the fact becomes `Flap moves`.
- **Power unit.** 1.6-litre V6 turbo, MGU-K 350 kW, close to 50:50 combustion and electric, no MGU-H.
- **Floor.** "Most of the grip" still holds in 2026 with the flatter floor. If not, the fact becomes `Downforce`.
- **Straight Mode.** Available to every car in the marked straight-mode zones, not only within a second (that is Overtake Mode). This matches Chapter 02.
- **Top speed.** Recompute at build time; it changes after Las Vegas (22 Nov). Car 10 is Pierre Gasly (Alpine).
- **History photos.** Re-check each Commons file's licence and author before download.
- **Copy against the model (my call):** the copy follows the real 2026 rules. MaG80's car is a fan design, and its credit says so. If a fact changes at review (say, one front flap rather than two), only the words change; the model stays.

## Proof before PR

- **Blender:** `blender/car/build.sh` rebuilds the glb, parts JSON and posters from the MaG80 download; the glb is within budget; Praffi has passed the checkpoint.
- **Unit tests** (`test/car/`, `test/speed/`):
  - the top speed takes the highest `st_speed`, skips nulls, and breaks a tie by the earlier lap, then the earlier race;
  - incremental: a race older than 48 hours makes no `laps` request and carries forward; a race under 48 hours old is fetched again;
  - season fallback before the first race;
  - an OpenF1 failure keeps the previous value and still writes the snapshot;
  - a snapshot without `topSpeed` still decodes;
  - `parts.json` lists the eight parts in order, each with an explode offset, an anchor and a camera framing;
  - the Next band label and headline for this weekend, next race, season finale, a finished last race with nothing after it, and no snapshot.
- **e2e** (`e2e/car.spec.ts`, desktop and phone):
  - loads in both themes; no horizontal overflow at 1470 and 390; every photo credited;
  - the band's eight rows, with the fixture's part facts; clicking row 06 brings part 06 to the front (row open, `Part 06 of 08`);
  - the band stays in the opposite theme in both themes;
  - the WebGL canvas draws (non-blank pixels) once the band is near; with WebGL disabled the exploded poster shows and the list works;
  - reduced motion: no pin, every job visible, the posters shown;
  - the fixture top speed (361 km/h, Gasly, Mexico City, lap 48); with `/api/season` failing, no number renders and the car still shows;
  - the Next band reads `Round 21 · this weekend` from the fixture and links to `/weekend`;
  - Chapter 04's hero link and Next card, Home row 05 and the menu lead here; the menu shows five linked chapters.
- **Checks:** `bun test`, `bun run lint` and `bunx playwright test` are green.
- **Live:** scroll through it in the browser at 1440 and 390, both themes; watch the take-apart and the flaps.
- **Review:** sol-loop, then the `pr` skill for the body.

## Left to the builder

- The decimation settings per part, as long as the silhouettes match the posters and the budget holds.
- The exact camera framings per part, tuned in Blender and exported in `parts.json`.
- The scroll length of the pin and how much of it the explode takes before the first part lights.
- How the top-speed builder splits into pure picking (tested without I/O) and the OpenF1 calls.
- The ladder's type sizes between the mock values and the viewport.
