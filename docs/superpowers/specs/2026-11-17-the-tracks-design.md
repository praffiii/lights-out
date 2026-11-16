# The tracks: design

## Why

The menu already lists "The tracks", marked `Soon`. A new fan watching a race does not know where it is or how this track differs from last week's. The tracks answers both:

- **The index** puts every 2026 circuit side by side at one scale.
- **One page per circuit** reads a single lap: its sectors, its corners, where drivers brake, and its history.

This is not `/season`. The season page already has the calendar, and it keeps it (Praffi, 2026-11-17). The index has no dates and no results. It is about the places.

**Scope (Praffi, 2026-11-17):** the index plus the first circuit page, Las Vegas.
- Las Vegas comes first because its model (`us-2023`) is already live and its race is this weekend (19–21 Nov).
- Lusail and Yas Marina are also modelled, so each remaining race weekend can bring its page.
- The other circuits follow one at a time, each with its own small spec. Per DESIGN.md, "per circuit, built once; per race, data only".

The bar is the same as the chapters: landonorris.com and mercedesamgf1.com.

Anything below that does not come from the approved Figma frames, DESIGN.md, `docs/motion-map.md` or an earlier Praffi decision is marked **my call**.

## Approaches

### Where the braking numbers come from

The mock's braking section ("Seven stops.", 337 km/h into Turn 14, 3.8 s, 66 % flat out) was measured by hand from OpenF1, on the fastest lap of the 2025 race.

1. **The stored pole lap (my recommendation).**
   - The hourly workflow already fetches the latest pole lap at every modelled circuit and stores it as `pole:v1:<circuit>`. That data includes brake, throttle and speed rows, and the site reads it from `/api/pole/<circuit>`.
   - The braking section computes from those rows in the browser. That means no new request, no new KV key and no new workflow step.
   - It updates itself: Friday night's 2026 pole lap replaces 2025's on its own, the same as the weekend band.
   - The cost is copy. The text names a pole lap, not the race's fastest lap, and the numbers change. Today the stored Las Vegas lap is Norris's wet 2025 pole, so until Friday the section shows wet numbers, tagged `Wet`.
2. **Numbers baked into the repo from the 2025 race.**
   - These are the mock's exact numbers.
   - They freeze at 2025, which breaks "data updates itself" (Praffi, 2026-11-10). Every page would also need a hand-run analysis.

**Praffi to pick.** The rest of this spec is written for option 1. If Praffi picks option 2, only [Braking](#braking) and its tests change.

### How the index highlights this weekend's circuit

The index's sizes band is one Blender render, and the circuit raced this weekend glows purple.

1. **One cool render plus one small hot patch per circuit (my call).**
   - Blender renders the whole band with every circuit cool.
   - For each circuit it also renders a patch: that circuit's cell, padded by the width of its glow, with only that circuit hot.
   - The page lays the current circuit's patch over the base image at its exact pixel position. Outside that circuit's glow the two images are identical, so the join cannot show.
   - Which patch shows comes from the season snapshot, so it moves to the next circuit with no rebuild.
2. **A new full render each race week.** This breaks "data updates itself".
3. **Drawing the 23 circuits live in three.js.** It loads WebGL and 23 meshes for what is a still poster.

## Starting point: the approved Figma frames

The frames are in Figma file `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks".

| Frame | Light | Dark |
|---|---|---|
| Index, desktop | 201:434 | 202:443 |
| Index, phone | 205:461 (board 131:2) | 205:814 (board 135:2) |
| Las Vegas, desktop | 416:893 (x 37160) | 420:902 (x 38700) |
| Las Vegas, phone | 421:911 (board 131:2, x 9010) | 421:1149 (board 135:2, x 9010) |

Approvals:
- Praffi approved the index on 2026-11-17.
- Praffi approved the Las Vegas light desktop direction on 2026-11-17 ("ok go ahead"). The dark desktop and both phone frames followed the same day, and this spec was asked for after them.

## The index: `/tracks`

Top to bottom:

1. **Hero.**
   - Label: `The tracks · <season> season`.
   - A giant `23` with "tracks this / season." beside it.
   - Intro: "From Melbourne in March to Abu Dhabi in December: streets, parkland and purpose-built circuits, and no two ask the same of a car."
2. **Three facts**, as hairline columns:

   | Label | Value | Line |
   |---|---|---|
   | Longest lap | Spa | 7.004 km |
   | Shortest lap | Monaco | 3.337 km |
   | Newest | Madring | Madrid, 2026 |

   - All three are worked out from `CALENDAR`, never typed in: longest and shortest by `lengthKm`, newest by `firstGp`.
   - The newest circuit's city is the snapshot race's `locality`. With no snapshot, the line is just the year.
   - The count `23` and the intro's first and last city also come from `CALENDAR` and the snapshot.
3. **Side by side**, the signature band. It is dark in both themes, because circuit sections always are. See [The sizes band](#the-sizes-band).
4. **Next band.**
   - Label `Next · The people`, headline "Meet the / grid.", Kimi Antonelli portrait (Melbourne Walk, 2026, Photo Yu Chu Chin, CC BY-SA 4.0).
   - The people page is not built yet, so the link renders as `Soon`.
   - **My call:** the shared `Next` component takes its label as a prop instead of always building `Next · Chapter n · min`. The chapter pages pass the same text they show today.

### The sizes band

What you see:
- Label `Same scale`, headline "Side by / side."
- Body: "Every 2026 circuit, north up and drawn to one scale on a 1 km grid. A lap of Spa is twice as long as a lap of Monaco."
- The render: all 23 circuits glowing cool white on the dark grid, in calendar order.
  - Desktop: 6 columns by 4 rows.
  - Phone: 3 columns by 8 rows.
- Under each circuit, a mono label `01  Albert Park`, using the round number and the short name.
- A `1 km` scale bar: 88 px on desktop, 46 px on a phone, both at the render's 1:1 width.
- **This weekend's circuit** glows purple, and its label becomes a chip: `21 · Las Vegas · 6.201 km` on desktop, `21 Las Vegas` on a phone.
  - "This weekend" is the race the menu shows (`pickRace`).
  - Between seasons, or with no snapshot, nothing is lit and every label is plain.
- Footnote: "Layouts: bacinger/f1-circuits (MIT), modelled in Blender · track width exaggerated so it shows · seen at an angle on a 1 km grid, so the bar holds left to right".

**Short names (my call).** `CalendarCircuit` gains an optional `short`, used wherever a name has to fit a label:
- `villeneuve` → Montréal
- `catalunya` → Barcelona
- `spa` → Spa
- `americas` → Austin
- `rodriguez` → Mexico City

**Links.**
- A circuit that has a page links to `/tracks/<id>`. Today that is only Las Vegas.
- The mock's hint "Pick a track to open it" would promise 23 pages when one exists. **My call:** circuits with a page show a `→` after their name, and the hint reads "Pick a track with → to open it". Once every circuit has a page, the `→` goes and the mock's hint comes back.

**The render** is `blender/circuits/sizes.py` plus `sizes.sh`, ported from the 2026-11-17 pipeline (`lights-out-private/pipeline-2026-11-17/sizes_glow.py`), with its comments removed.
- It uses the same bacinger layouts, an orthographic camera at 50° pitch, a faded 1 km grid, and the same slab, core and halo as the mock.
- **Outputs**, as WEBP in `public/circuits/sizes/`:
  - `desk.webp` (2880 × 2000) and `phone.webp` (1170 × 3261), every circuit cool;
  - `desk-<tile>.webp` and `phone-<tile>.webp` per circuit: the padded cell with only that circuit hot, cut with Blender's render border;
  - `src/tracks/sizes.json`, the pixel box of each patch per layout, so the page places patches from data and never guesses.
- **Budget:** each base image under 400 KB; each patch under 40 KB.
- Below 720 px the page uses the phone render, above it the desktop render. Both scale to the band width. Labels and patches are placed in percent of the render, so they scale with it.
- **Rebuilt** only when the calendar changes, which is the season-start check DESIGN.md already names.

## The circuit page: `/tracks/vegas`

`/tracks/$circuit`, where `$circuit` is the calendar id, the same id `/lap/$circuit` uses. Only a circuit with a written page renders. Every other id gets the site's 404.

**Page content** lives in `src/tracks/pages.ts` as `TRACK_PAGES`, typed `Partial<Record<ModelledId, TrackPage>>`. A circuit cannot have a page without a model. It holds the hand-written copy and photos below. Every number comes from the registry, the snapshot or the pole lap.

Top to bottom (the copy shown is Las Vegas):

### 1. Hero

- Label `The tracks · Round <n> · United States`.
  - The round comes from the snapshot calendar (matched by `circuitId`); the country is page copy.
  - If the circuit is not on this season's calendar, the round is left out.
- Headline "Las Vegas.", intro "A street circuit through the casinos, raced on Saturday night."
- A full-bleed photo with its caption block: Esteban Ocon, Haas VF-25 · Las Vegas, 2025 · Photo DHS · Public domain. On a phone the caption block stays dark, which is the phone convention.

### 2. Read the lap (the band)

The circuit band, dark in both themes. It reuses the weekend band's `CircuitStage` as it is: the map, the turn chips, the Sectors toggle, and the pole lap replay with its HUD and credit.

- Label `Read the lap`, headline "Down the Strip. / Past the Sphere." (page copy).
- **Layer chips.** The mock shows Sectors, Corners, Straight mode and Braking. **My call:** ship Sectors and Corners only, the two toggles that exist today.
  - Straight mode has no 2026 Las Vegas source. Drawing guessed zones breaks "never invent".
  - A braking layer on the map was never designed. The Braking section below tells that story.
  - Either can come later as its own small change.
- **Place tags.** "The Sphere · 112 m of LEDs" and "The Strip · Las Vegas Boulevard": white mono pills, positioned like the turn chips.
  - Each is page copy anchored to a lap fraction `u` on the model's line, and the stage projects it the way it projects pins.
  - On a phone the Sphere tag sits at the top of the band with a line down to its point.
- **Stats column**, from the registry: First race here `2023`, Lap `6.201 km`, Race laps `50`, Race distance `309.958 km`.
- **Explain.** "Three timed sectors: S1 purple, S2 green, S3 yellow." Then, from the pole lap: "The longest run without braking: <s> seconds, from Turn <a> to Turn <b>." With no pole lap, only the first sentence shows.
  - **My call:** the data sentence names turns, not "the Strip", so it stays true if a new lap moves the longest run.
- The mock's hint "Press a corner · switch the layers" promised that corners can be pressed, which they cannot. **My call:** in its place is the weekend band's existing link, "Explore the lap in 3D →" to `/lap/vegas`.
- **Footnote:** "Layout: bacinger/f1-circuits (MIT) · elevation: SRTM 30 m (NASA), exaggerated 1.5x · Map © OpenStreetMap contributors (ODbL) · turn numbers: F1 circuit map". The timing credit comes from the stage's existing `stageCredit(lap)`.

### 3. Corners

- Label `Corners`, headline "<Seventeen> / turns." The number comes from `facts.turns` as a word.
- Body: "Anticlockwise, on public roads closed for the sessions. Two corners worth knowing first." The direction comes from `facts.direction`; the rest is page copy.
- Two corner cards, each with a photo, caption block, tag, line and credit:
  - `T7–9 · The Sphere`: "Three slow corners that wrap around the Sphere, the 112-metre LED globe beside the track." Charles Leclerc, Ferrari SF-25 · Las Vegas, 2025 · Photo DHS · Public domain.
  - `T12 · Onto the Strip`: "A left onto Las Vegas Boulevard, then the longest run of the lap without braking." Red Bull RB21 · Las Vegas, 2025 · Photo DHS · Public domain.
  - **My call:** the mock's "then 22 seconds before anyone brakes again" was a measured number in hand copy, and it would go stale. The explain line above carries the live number.

### 4. Braking

Every number here comes from the stored pole lap. See [Braking](#braking) for the rules.

- Label `Braking`, headline "<Seven> / stops.", the zone count as a word.
- Body: "Measured on <Driver>'s pole lap, <year>, <m:ss.sss>. The biggest stop is into Turn <n>." If the lap is wet, a `Wet` tag follows, as on the weekend band.
- Four stats (phone labels in brackets):

  | Label | Value | Line |
  |---|---|---|
  | Into Turn <n> (Into T<n>) | `<entry>` km/h | Down to <min> km/h |
  | On the brakes | `<s>` s | About <m> metres |
  | Flat out | `<pct>` % | <s> s of the lap |
  | Braking zones | `<n>` | On one lap |

- Payoff row (purple): `So` · "<N> seconds a lap on the brakes, <M> flat out."
- Credit: "Telemetry: OpenF1 · <year> <GP> qualifying, car <n>, pole lap · brake on/off, about four samples a second".
- **No pole lap** (204, a failed fetch, or still loading): the section is not rendered. Nothing is invented.

### 5. History

- Label `History`, headline "Three titles / settled here." (page copy).
- Rows, each with a year, a line and a hairline:
  - `1981`: "The first race, in the Caesars Palace car park. Piquet finishes fifth and is champion by one point."
  - `1982`: "Alboreto wins. Rosberg is champion, with one win all season."
  - `2024`: "Russell wins on the Strip. Verstappen takes his fourth title."
- **The live row** is shown only while this circuit's race is the menu's race and it has not finished.
  - The year is in purple, and the line reads "Round <n>, <when>." with `when` from `RACE_WHEN`.
  - If `titleFight` says the title is decided or over, it adds " <Family> arrives as champion."
  - Once the race is done the row goes. **My call:** keeping past 2026 winners would need a new per-race fetch, and it can come later.
- Photo: Caesars Palace · 1982 / Derek Warwick, Toleman · Video still · Public domain (author unknown), via Wikimedia Commons.

### 6. Next band

The same as the index: `Next · The people`, `Soon`.

## Braking

Braking is a pure module, `src/tracks/braking.ts`, from `PoleLap` and the circuit's line and pins to the numbers above. It is tested without I/O. Rows are `[t, u, speed, gear, throttle, brake]`.

- **A braking zone** is a run of rows with `brake > 0`.
  - Runs less than 0.5 s apart join into one zone.
  - A zone shorter than 0.2 s is dropped as noise.
  - **My call** on the thresholds. They give the 7 zones that the hand analysis found on the 2025 race lap, which the tests pin.
- **A zone's turn** is the first turn pin at or after the zone's start along the lap. A pin's `u` is the `u` of the nearest line point, wrapping past the line.
- **Entry speed** is the speed at the zone's first row. **Minimum** is the lowest speed from there until the speed rises again.
- **The biggest stop** is the zone with the largest entry minus minimum. Ties go to the earlier zone.
- **On the brakes** is the biggest stop's duration. Its distance is the integral of speed over that time, rounded to 10 m.
- **Time on the brakes in total** is the sum of all zone durations.
- **Flat out** is the share of lap time with `throttle >= 99`.
- **The longest run without braking** is the longest gap between consecutive zones, wrapping across the line. It is named by the turns of the zone before and the zone after it.
- The section shows `0` decimal places for km/h and %, and `1` for seconds.

## Wiring

- **Routes:** `src/routes/tracks.tsx` and `src/routes/tracks.$circuit.tsx`.
  - Head titles: `The tracks · Lights Out` and `Las Vegas · The tracks · Lights Out`, each with a one-line description.
  - Stylesheets: `stageCss` plus a new `tracksCss`.
- **Code:** `src/tracks/` holds `Index.tsx`, `SizesBand.tsx`, `TrackPage.tsx`, `pages.ts`, `braking.ts` and `sizes.json`.
  - The page fetches its pole lap once on mount, through `usePoleLap`, and hands it to both the band and the braking section.
- **Menu:** "The tracks" gets `to: '/tracks'`.
- **Photos:**
  - `public/img/tracks/vegas-*.jpg` (hero, Sphere, Strip and 1982), about 2400 px wide for desktop.
  - Phone crops come from the same files through `<picture>` sources, following the mock framing. The hero crop keeps the car clear of the title.
  - Each photo gets an entry in `src/credits/photos.ts`, so the credits page lists it.
- **Docs:**
  - DESIGN.md gets one bullet under 3D for the sizes band (cool base plus hot patches; rebuilt at season start).
  - Spec §8 notes that The tracks has shipped with its first circuit.

## Rules that apply

- **The 7 rules (DESIGN.md):**
  - Every section is a poster.
  - The band is the one dense widget per page. The index's sizes band is a still with labels, not a widget.
  - Every photo has a caption block or place line, plus its credit.
  - Circuits are always the dark broadcast screen.
  - One ease family.
  - No text-only section.
- **Motion:** the existing helpers (`reveal`, `sweep`, `roll`, `block`), following the weekend page. Stats roll, headlines sweep. No new pins or scrubs.
- **Reduced motion:** the band shows its poster with no lap running, as on the weekend page. Stats show their final values.
- **Code:**
  - No code comments, Python included.
  - No `as` casts except `as const`, no `any`, no non-null `!`.
  - `bun run lint` passes.
- **Copy:** never invent numbers. Every number is from the registry, the snapshot or the pole lap, or it is a dated historic fact Praffi has checked.
- **Media:** Commons public-domain DHS photos and the public-domain 1982 still. No F1, FIA or team logos as graphics.
- **Zero cost:** no new Worker routes, KV keys, requests or services. The page reads `/api/season` and `/api/pole/vegas`, which already exist.

## Facts to verify before ship

- The race distance, 309.958 km (registry).
- The Sphere is 112 m tall.
- 1981: Piquet finished fifth at Caesars Palace and was champion by one point.
- 1982: Alboreto won; Rosberg was champion with one win all season.
- 2024: Russell won and Verstappen took his fourth title.
- The 1982 Warwick still: is it really public domain, and is it sharp enough at 432 px desktop width (the source is 484 px)? If it fails, the history photo becomes a 2025 DHS shot of the Strip.
- The two corner photos are Las Vegas 2025 but do not show the named corners. The captions name the car, not the corner, so they stay honest. Praffi to confirm that is enough.
- The 2025 pole lap stored today is wet. Check that the braking section reads sensibly with the `Wet` tag until Friday's session replaces it.

## Proof before PR

- **Blender:** `blender/circuits/sizes.sh` rebuilds both base images, the 46 patches and `sizes.json`. All are within budget. Each patch laid over its base differs from the base only inside its own circuit's glow (a pixel diff in the script).
- **Unit tests** (`test/tracks/`):
  - braking on the stored 2025 Las Vegas race-lap fixture: 7 zones; biggest stop into Turn 14, entry 337, minimum 96; longest run Turn 12 to Turn 14, about 22 s;
  - braking on a wet pole-lap fixture still gives whole numbers and a turn for each zone;
  - zone joining, noise drop, and the wrap across the line;
  - the index facts (longest, shortest, newest) from `CALENDAR`;
  - the lit circuit: this weekend, next race, finale finished, no snapshot;
  - the live history row: shown before the race, champion clause only when decided, gone after;
  - `/tracks/<id>` with no page is a 404.
- **e2e** (`e2e/tracks.spec.ts`, desktop and phone, both themes):
  - no horizontal overflow at 1470 and 390;
  - every photo credited;
  - the index shows 23 labels, with the fixture's weekend circuit as the chip and its patch shown; Las Vegas links to `/tracks/vegas`;
  - the Las Vegas band draws (non-blank WebGL pixels) and its two toggles work;
  - the braking numbers match the fixture pole lap; with `/api/pole/vegas` returning 204, the braking section is absent and the page still renders;
  - the menu's "The tracks" goes to `/tracks`.
- **Checks:** `bun test`, `bun run lint` and `bunx playwright test` are green.
- **Live:** scroll both pages in the browser at 1440 and 390, in both themes.
- **Review:** sol-loop, then the `pr` skill writes the body.

## Left to the builder

- The exact placement maths for labels and patches, as long as it comes from `sizes.json`.
- How `Next` takes its label, as long as the chapter pages render as they do today.
- Phone crops of the photos, matched to the phone frames.
- Whether the place tags reuse the pin component or get a sibling.
