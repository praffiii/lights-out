# Race Weekend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Race weekend page at `/weekend` from the approved Figma frames. It always shows the current or next Grand Prix:
- the circuit photo hero;
- a big countdown to the next session;
- an interactive 3D circuit band with the facts and the schedule in the visitor's time;
- the latest session result, practice included;
- a teaser to How F1 works.

**Architecture:**
- **One new piece of data: the latest session result.** The hourly refresh asks OpenF1 for the newest finished session of the season and its result, and stores it as an optional `latestSession` in the snapshot.
  - Checked on 2026-11-09: OpenF1's historical data is free without an account. `session_result` for São Paulo FP2 (session 11406) returned positions, best laps and gaps, and `drivers` maps each car number to its code.
  - If OpenF1 fails, the snapshot is still written without `latestSession`, and only the Latest block is left out. This is the same pattern as `history`.
- **Pure page model.** As on This season, every number and every data-driven sentence comes from pure functions of `(snapshot, now, visitor time zone)` in `src/weekend/page-model.ts`. The components only lay them out.
- **The circuit band reuses Home's 3D circuit.** `src/circuits/Circuit.tsx` gains a yaw (drag to spin) and an option to turn off the lap light. The 3D roads, turn pins and sector meshes already exist for the five circuits from now to the 2027 opener: Interlagos, Las Vegas, Losail, Yas Marina and Albert Park.
- **Prerendered without data, like This season.** The sections render on the client once the snapshot is loaded. Before that, and on any failure, the page shows one waiting line.

**Tech Stack:** As This season: TanStack Start on Cloudflare Workers, TanStack Query, Effect 4 schemas and services, React 19.3, R3F and three.js, GSAP with the `src/motion/motion.ts` grammar, `bun test` with happy-dom, and Playwright (headed Chrome, 2 workers).

**Spec:** `docs/superpowers/specs/2026-11-07-f1-fan-site-design.md`, item 6 ("the latest results (race, qualifying, sprint)") and §8. Also read `DESIGN.md` and `docs/motion-map.md`.

**Figma** (file `IPkJZWQnY0IKdIjf6Nuugl`, page 13:2). There is no phone frame (see Task 7).

| Section | Light (68:2) | Dark (70:2) |
|---|---|---|
| Hero: photo, title block, caption | y 88–988 | same layout |
| Countdown | y 1066–1458 | same layout |
| Circuit band (opposite theme) | 68:49, y 1586–2666 | same layout |
| Latest result | y 2746–3342 | same layout |
| Teaser to Chapter 02 | 68:145, y 3406–4114 | same layout |

Read each section with `get_design_context` before building it, and match type, spacing and colour to the frame.

**Scope, decided by Praffi on 2026-11-09:**
- **Latest includes practice,** through OpenF1.
- **The "Overtake detection" toggle is dropped** until the overtaking chapter. The band ships with two working toggles: Turns and Sectors.
- **The circuit band is interactive** in our matte look, with no glow:
  - drag sideways to spin, with momentum;
  - a reset button eases it back to the poster pose;
  - turn numbers ride on stems that follow the road;
  - the Blender still shows until the band scrolls into view.

**My calls, flagged for Praffi:**
- **Route.** The page lives at `/weekend` and is not added to the menu, because the approved menu has no slot for it. It is reached from the weekend box on every page.
- **Corner names.** The data names one corner per circuit, such as turn 1 "S do Senna". It shows as a fixed label, as in the mock, not on hover.
- **Links with nowhere to go yet.** "Explore the lap in 3D", "Full timesheet" and the Chapter 02 "Read" stay "Soon".

## Global Constraints

- **Code style.** No code comments anywhere, no `as` assertions (except `as const`), no `any`, no non-null `!`. `bun run lint` passes before every commit.
- **Commits.** Commit locally after each task with a conventional, present-tense title. Never add a `Co-Authored-By` trailer. Never push, open a PR or deploy without Praffi's explicit word. Ask before any Cloudflare action.
- **Media.** Wikimedia Commons under CC0, CC BY or CC BY-SA, or public domain, with the credit on the page. Never use OpenF1's `headshot_url`: those are Formula 1's photos. No F1, FIA or team logos.
- **Network.** OpenF1 requests send `User-Agent: LightsOutFanSite/0.1 (personal project)`. They are sequential, at least 400 ms apart, and capped at 20 s in total. The free tier allows 3 requests per second and 30 per minute.
- **Themes and motion.** Light and dark both match their frames, and the circuit band uses the opposite theme. Under reduced motion there is no motion and no hidden text. The track can still be dragged, but without momentum.
- **Prerender-safe.** No `window`, `document`, `matchMedia` or `location` at module level or during render. `useTheme().theme` can be `null`; treat it as `'light'`.
- **Scoped styles.** Route stylesheets stay loaded after in-app navigation, so every rule in `weekend.css` sits under `.weekend-page`. Never reuse a class that `site.css`, `home.css` or `season.css` styles unscoped (`.bar`, `.strip`, `.display`, `.dot`, `.chip`, `.lead`, `.photo`, `.card`).
- **Motion.** Every move comes from `src/motion/motion.ts` (`sweep`, `reveal`, `block`, `draw`, `roll`). Never `once: true` on a ScrollTrigger; use `ONCE`. Each section sets up its own `useGSAP` once its data has rendered.
- **Copy.** Every data-driven sentence is written out word for word in Task 2. Praffi checks the copy before deploy.
- **Names and colours.** Drivers come from `CARS` (`src/home/cars.ts`), matched on the three-letter code. Codes `CARS` doesn't know, such as a reserve driver in FP1, fall back to OpenF1's full name and `#<team_colour>`.

## Review Focus

1. **OpenF1 fails, needs a login during a live session, or has no result yet.** The snapshot is still written, the Latest block is left out, and nothing else changes. Task 1 tests a failure, a timeout and an empty result.
2. **A driver `CARS` doesn't know,** such as a rookie in FP1. The name and colour come from OpenF1. With no portrait, the block uses the car photo, and with no car photo it drops the image column. Task 2 tests this.
3. **A visitor far from the track.** Each schedule row's weekday and time are in the visitor's zone, so the Interlagos race shows as "Mon 00:00" in Jakarta. Task 2 tests this.
4. **More than a day to go, or a time not confirmed.** From 24 hours out, the countdown shows days, hours and minutes. When the target's time is not confirmed, it shows days only, with the "not confirmed" line. Task 2 tests both.
5. **A circuit with no 3D model,** such as 2027 round 2. The band shows the facts and the schedule with no render and no toggles. Task 4 tests this. On touch screens a vertical swipe on the track still scrolls the page; Task 8 tests this.

---

### Task 1: The latest session result in the snapshot

**Files:**
- Create: `src/season/openf1-schema.ts`, `src/season/openf1-client.ts`, `src/season/latest-session.ts`, `test/fixtures/openf1/{sessions,session_result,drivers}.json` (saved from the real API for São Paulo FP2, session 11406), `test/season/latest-session.test.ts`
- Modify: `src/season/snapshot-schema.ts`, `src/season/build-snapshot.ts`, `tools/refresh-season.ts`, `test/fixtures/season-snapshot.json`, `test/season/build-snapshot.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const LatestSession = Schema.Struct({
    name: SessionName,
    startsAt: Schema.String,
    rows: Schema.Array(Schema.Struct({
      position: Schema.Number,
      code: Schema.String,
      name: Schema.String,
      colour: Schema.String,
      time: Schema.NullOr(Schema.Number),
      gap: Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
    })),
  })
  ```
  - `SeasonSnapshot` gains `latestSession: Schema.optionalKey(LatestSession)`.
  - `class OpenF1Client extends Context.Service` with `sessions(year)`, `result(sessionKey)` and `drivers(sessionKey)`.
  - `latestSession(season: number, now: Date): Effect.Effect<LatestSession | undefined, never, OpenF1Client>`.
- `SessionName` already lives in `jolpica-schema.ts`. The OpenF1 names map to it: `Practice 1→FP1`, `Practice 2→FP2`, `Practice 3→FP3`, `Sprint Qualifying` or `Sprint Shootout→SprintQualifying`, `Sprint→Sprint`, `Qualifying→Qualifying`, `Race→Race`.

- [ ] **Step 1: Write the failing tests** in `latest-session.test.ts`, using a stub `OpenF1Client` layer:
  - `picks the newest session that ended before now`: with the sessions fixture and `now = 2026-11-06T21:00Z`, the result is FP2 (`name: 'FP2'`), and row 1 is `{ position: 1, code: 'ANT', time: 70.763, gap: 0 }`.
  - `skips a session whose result is not out yet`: with an empty result for the newest session, it returns the one before.
  - `returns undefined and logs when OpenF1 fails`: the stub fails with a 401.
  - `returns undefined after 20 s`: the stub never answers; run it with `TestClock`.
  - In `build-snapshot.test.ts`: `writes the snapshot without latestSession when OpenF1 fails`.
- [ ] **Step 2: Run them and watch them fail.** `bun test test/season` → FAIL with "latestSession is not defined".
- [ ] **Step 3: Implement.**
  - **Client.** Copy the Jolpica client's shape: a base URL of `https://api.openf1.org/v1`, the user agent, `filterStatusOk`, `retryTransient` on errors only, and a one-permit semaphore with `400 millis` spacing. Decode with the schemas, and map errors to `OpenF1Error`.
  - **`latestSession`.** Read `sessions?year=`. Take the finished sessions (`date_end` before `now`) newest first, and try at most two of them. For each, read `session_result?session_key=` and `drivers?session_key=`, and join the rows on `driver_number`. Apply `Effect.timeout('20 seconds')` and `Effect.catch` with a warning log, exactly like `history`.
  - **Wiring.** `buildSnapshot` attaches the result only when it is defined. `tools/refresh-season.ts` merges `OpenF1Client.layer` into its services. Add a `latestSession` for FP2 to the e2e fixture, `test/fixtures/season-snapshot.json`.
- [ ] **Step 4: Run** `bun test` → all pass, and `bun run lint` → clean.
- [ ] **Step 5: Commit** `feat(season): the snapshot carries the newest finished session's result from OpenF1`.

### Task 2: The page model and the calendar file

**Files:**
- Create: `src/weekend/page-model.ts`, `src/weekend/ics.ts`, `test/weekend/page-model.test.ts`, `test/weekend/ics.test.ts`
- Modify: `src/season/weekend.ts` (move `zoneName` here from `WeekendBox.tsx` and export it)

**Interfaces:**
- Consumes: `pickRace`, `when`, `countdown`, `SESSION_LABEL`, `SESSION_MINUTES`, `latestStart` and `gpName` from `src/season/weekend.ts`; `calendarCircuit` and `circuitFor`; `CARS`; `portraitFor`.
- Produces:
  ```ts
  export function weekendPage(snapshot: SeasonSnapshot, now: Date, zone: string): WeekendPage | null
  export type WeekendPage = {
    label: string
    title: string
    dates: string
    place: string
    photo: CalendarCircuit['photo'] | undefined
    clock: Clock
    note: string
    band: Band
    latest: Latest | null
  }
  export type Clock = { label: string; target: string; units: 'dhm' | 'hms' | 'd'; track: string; yours: string; confirmed: boolean }
  export type Band = { when: string; info: CircuitInfo | undefined; facts: CalendarCircuit | undefined; zone: string; schedule: ReadonlyArray<{ label: string; day: string; time: string; state: 'done' | 'next' | 'later' }> }
  export type Latest = { label: string; gap: string; headline: string; body: string; rows: ReadonlyArray<{ position: number; code: string; colour: string; time: string }>; image: Photo | undefined; who: string }
  export function clockDigits(clock: Clock, now: number): ReadonlyArray<{ value: string; unit: string }>
  export function weekendIcs(snapshot: SeasonSnapshot, now: Date): { filename: string; body: string } | null
  ```

**Copy, word for word.** `T` is a session's time at the track (HH:MM). `Day` is the race's weekday at the track.
- `label`: `This season · Round ${round} of ${of}`.
- `title`: `${grandPrix(gp)}.`, for example "São Paulo Grand Prix.".
- `dates`: `${first day}–${race day} ${Month} ${year} · ${circuitName}`, for example "6–8 November 2026 · Autódromo José Carlos Pace".
- **`clock.label`.** `Next · ${SESSION_LABEL}`, or `Live · ${SESSION_LABEL}` while a session runs. A live clock counts to the session's end, using `SESSION_MINUTES`.
- **`clock.units`.**
  - `hms` under 24 hours to go.
  - `dhm` from 24 hours.
  - `d` when the target's time is not confirmed.
- **`clock.track` and `clock.yours`.** `${Sat 7 Nov} · ${T} at the track` and `${HH:MM} your time`.
- **`note`, about the session after the target.** `Then ${label in lower case} at ${T} track time: ${ABOUT}`. When the target is the race, the note is `${laps} laps, ${distance} km. ${ABOUT.Race}`. When the target's time is not confirmed, the note is `Session times are not confirmed yet.`
- **`ABOUT`:**
  - **FP1, FP2, FP3:** `an hour for teams to try set-ups. Times hint, they don't decide.`
  - **SprintQualifying:** `a shorter knockout that sets the sprint grid.`
  - **Sprint:** `a 100 km race with points for the top eight.`
  - **Qualifying:** `three knockout rounds that set ${Day}'s grid.`
  - **Race:** `Points go to the top ten, 25 for the win.`
- **Band.**
  - `when`: `6–8 Nov`.
  - Schedule rows: the session label, the weekday in capitals in the visitor's zone (`FRI`), and the time as `HH:MM` in the visitor's zone.
  - `state` is `done` after a session ends, `next` for the clock's target, and `later` otherwise.
  - The `next` row's day reads `${DAY} · next`.
- **`latest`**, from `latestSession` (`null` when it is missing or has fewer than two rows):
  - `label`: `Latest · ${SESSION_LABEL} · ${Fri 6 Nov}`. The day is the session's day at the track.
  - `gap`: P2's gap as `0.087 s`. A string gap such as `+1 LAP` reads `1 lap`.
  - `headline`, by session:
    - **Practice:** `${P1} fastest. ${P2} that far behind.`
    - **Qualifying:** `${P1} on pole. ${P2} that far behind.`
    - **SprintQualifying:** `${P1} on sprint pole. ${P2} that far behind.`
    - **Sprint:** `${P1} wins the sprint. ${P2} that far behind.`
    - **Race:** `${P1} wins. ${P2} that far behind.`
    - Names are family names from `CARS`, or the last word of OpenF1's name.
  - `body`: `${P3} third, ${P4} fourth. ${LESSON}`. The first sentence is dropped when there are fewer than four rows.
  - **`LESSON`:**
    - **Practice:** `Practice times hint, they don't decide: teams run different fuel loads and tyres.`
    - **Qualifying:** `Pole is the best seat into Turn 1, not a promise.`
    - **SprintQualifying:** `It sets the sprint grid only.`
    - **Sprint:** `Sprint points go to the top eight.`
    - **Race:** `Points go to the top ten, 25 for the win.`
  - `rows`: P1 to P3. P1 shows the time (`1:10.412` for a lap, `1:32:10.412` for a race); the others show `+0.087`.
  - `image`: the P1 portrait, else P1's car photo, else `undefined`. `who` is `${Full name} · ${Team}`.
- **ICS.**
  - `filename`: `${tile}-${season}.ics`.
  - One `VEVENT` per session, with `UID` `${season}-${round}-${name}@lights-out`, `DTSTART` in UTC and `DURATION` from `SESSION_MINUTES`.
  - `SUMMARY` is `${gp} · ${SESSION_LABEL}`. Sessions without a confirmed time become all-day events.
  - Lines end with CRLF.

- [ ] **Step 1: Write the failing tests** with the fixture snapshot, as fixed clocks:
  - **Weekend copy:** the hero copy at FP3−2h; `clock.units` `hms`, `dhm` (5 days out) and `d` (unconfirmed); the note after FP3 reads "…set Sunday's grid.", and "…set Saturday's grid." for Las Vegas.
  - **Visitor time:** the schedule in `Asia/Jakarta`, where the race row is `MON` `00:00`.
  - **Latest block:** the FP2 headline, body, gap and rows; a race with a `+1 LAP` gap; a driver missing from `CARS`; `latest` is `null` without `latestSession`.
  - **`weekendPage` is `null`** when no race is left this season and no next calendar is out.
  - **ICS:** five events, CRLF endings, and an unconfirmed session as all-day.
- [ ] **Step 2: Run them and watch them fail** → "weekendPage is not defined".
- [ ] **Step 3: Implement** the functions above, with `Intl.DateTimeFormat` for every zone conversion.
- [ ] **Step 4: Run** `bun test test/weekend` → pass, then `bun test` and `bun run lint`.
- [ ] **Step 5: Commit** `feat(weekend): the page model writes the weekend's copy, clock, schedule and latest result`.

### Task 3: The route, hero and countdown

**Files:**
- Create: `src/routes/weekend.tsx`, `src/weekend/Weekend.tsx`, `src/weekend/Top.tsx`, `src/weekend/Clock.tsx`, `src/styles/weekend.css`, `test/weekend/clock.test.tsx`
- Modify: `src/shell/WeekendBox.tsx` (the three `Soon` links become `<Go to="/weekend">`), and `vite.config.ts` only if `/weekend` is missing from the prerender output

**Interfaces:** Consumes `weekendPage`, `clockDigits`, `weekendIcs`, `useSeason`, `useSecond`, `waitFor` and `Go`.

- [ ] **Step 1: Write the failing test** `clock.test.tsx`. It renders `<Clock>` with FP3 two hours away, ticks `gsap.ticker.tick()` once a second, and expects the seconds digit to change. It also expects the "Add the weekend to your calendar" button to call `URL.createObjectURL` with a `text/calendar` blob.
- [ ] **Step 2: Run it** → FAIL, because the module is missing.
- [ ] **Step 3: Implement.**
  - **Route.** It copies `src/routes/season.tsx`: head meta, `weekend.css`, and `<Weekend>`, which shows the waiting line until there is data.
  - **`Top`.** The full-bleed photo (`/img/circuits/<circuitId>-2400.webp` with a 720 `srcSet`) and the title block. The block is ink on the light page and paper on the dark page, and the credit caption sits bottom right.
  - **`Clock`.** The label row, three digit groups with the grey colons from the frame, the unit labels, the note, and the calendar link. The link is a `<button>`: it builds the ICS blob and clicks a temporary `<a download>`.
  - **Links.** The weekend box's "Race weekend page", "Full weekend schedule" and "Full result" all go to `/weekend`.
- [ ] **Step 4: Run** `bun test` and `bun run lint`, then `bun run build`, and check that `dist` contains the prerendered `/weekend` page.
- [ ] **Step 5: Commit** `feat(weekend): the Race weekend page opens with the circuit photo and counts down to the next session`.

### Task 4: The interactive circuit band

**Files:**
- Create: `src/weekend/CircuitBand.tsx`, `test/weekend/circuit-band.test.tsx`
- Modify: `src/circuits/Circuit.tsx`, `src/home/Hero.tsx`, `src/styles/weekend.css`

**Interfaces:**
- `Circuit` gains two props: `yaw: RefObject<number>` (radians) and `lapLight: boolean`.
  - It wraps `gltf.scene` in a group that rotates around the track's centre on the vertical axis by `yaw.current`.
  - It marks the frame stale whenever the yaw changes.
  - With `lapLight` false, the light group stays hidden and the lap callbacks never fire.
- Home passes a constant `useRef(0)` and `lapLight`, so Home looks the same.
- `CircuitBand({ band, theme })`, where `theme` is the opposite of the page's theme.

- [ ] **Step 1: Write the failing tests** in `circuit-band.test.tsx`. The tests use happy-dom with no WebGL, so the band shows its poster:
  - the stats and the five schedule rows render, and the `next` row carries `is-next`;
  - the Turns toggle sets `data-turns="off"` on the stage, and the Sectors toggle sets `data-sectors="off"`;
  - with `info` undefined (no 3D model), the band shows the stats and the schedule only, with no stage and no toggles.
- [ ] **Step 2: Run them** → FAIL.
- [ ] **Step 3: Implement.**
  - **Layout from 68:49.** Stats at the top left, the schedule at the top right, the stage, the toggles at the bottom left, "Explore the lap in 3D" as `Soon` at the bottom right, and the credit `Blender model · layout bacinger/f1-circuits (MIT) · elevation SRTM (NASA)` under the card.
  - **Stage.** The poster `<img>` first. GL mounts once the band is within 200 px of the viewport; use an `IntersectionObserver` in an effect. It mounts under reduced motion too, because dragging is user-driven.
  - **Drag.**
    - Pointer events on the stage, with `touch-action: pan-y`, so vertical swipes scroll the page.
    - Horizontal movement sets `yaw.current += dx * 0.006`.
    - On release, the velocity decays by `× 0.92` per frame on `gsap.ticker`, skipped under `REDUCED`.
    - Tilt never changes.
  - **Reset.** A small reset button appears once `yaw ≠ 0`. It tweens the yaw, normalised to (−π, π], back to 0 over 0.8 s with ease `launch`. Under reduced motion it snaps.
  - **Turns.** The pins render as plain mono numbers on a 24 px stem (a `::before` line under the number). The named corner shows its name under the number, as in the frame. The toggle fades the pins in or out over 240 ms.
  - **Sectors.**
    - The toggle tweens the shader fill (`uTo`, through the `fill` ref) from 1 to 0 over 0.6 s, to plain grey, and back up to 1 to redraw the colours along the lap. Under reduced motion it snaps.
    - The S1, S2 and S3 labels sit at the projected centre of each sector mesh's bounding box, fading with the toggle.
- [ ] **Step 4: Run** `bun test` and `bun run lint`. Then check by hand on `bun run dev`: Home's hero still runs its lap, and the band spins.
- [ ] **Step 5: Commit** `feat(weekend): the circuit band spins under a drag, with turn and sector layers`.

### Task 5: The latest result and the teaser

**Files:**
- Create: `src/weekend/Latest.tsx`, `src/weekend/Teaser.tsx`, `test/weekend/latest.test.tsx`
- Modify: `src/weekend/Weekend.tsx`, `src/styles/weekend.css`

- [ ] **Step 1: Write the failing test.** With the FP2 fixture, the block shows "0.253 s", the headline "Antonelli fastest. Norris that far behind.", the body "Verstappen third, Russell fourth. Practice times hint, they don't decide: teams run different fuel loads and tyres.", three rows, and the portrait credit. These are São Paulo FP2's real top four: cars 12, 1, 3 and 63. With `latest` null, the block is not rendered.
- [ ] **Step 2: Run it** → FAIL.
- [ ] **Step 3: Implement.**
  - **Latest.** The layout from y 2746–3342: a 420×540 image with a caption block of name, team and credit; the label; the giant gap; the headline; the body; the rows with a 3 px team-colour bar; and "Full timesheet" as `Soon`.
  - **Without an image,** the text column takes the full width.
  - **Teaser.** `PHOTOS.ch02` full-bleed, with the caption block "Next · How F1 works · Chapter 02", "Watch the pass at Turn 1.", and "Read" as `Soon`, plus the credit line.
- [ ] **Step 4: Run** `bun test` and `bun run lint`.
- [ ] **Step 5: Commit** `feat(weekend): the page shows the latest session's gap and a way into How F1 works`.

### Task 6: Motion

**Files:** Modify `src/weekend/*.tsx` and `docs/motion-map.md` (add a "Race weekend" section under "This season" and mark it built).

- [ ] **Step 1: Add the moves.**
  - **Hero:** the title `sweep`s, the photo `reveal`s, and the label and dates `sweep`.
  - **Clock:** the digit groups `sweep` on enter and never animate on a tick.
  - **Band:** the card `reveal`s without drift, the stat numbers `roll`, and the schedule hairlines draw (`--hair`, as on This season).
  - **Latest:** the image `reveal`s, the gap `roll`s, and the P1 row is a `block` that fills last.
  - **Teaser:** the photo `reveal`s and the title `sweep`s.
- [ ] **Step 2: Check** with `bun run dev`, then with `?reduced`: no motion, and nothing hidden.
- [ ] **Step 3: Commit** `feat(weekend): the Race weekend page moves with the sector bar`.

### Task 7: Tablet and phone

**Files:** Modify `src/styles/weekend.css`.

- [ ] **Step 1: Add the breakpoints.**
  - **≤1199 px:**
    - the title block narrows;
    - the clock digits scale with `clamp`;
    - the band's stats wrap above the schedule;
    - the Latest image column narrows to 320 px.
  - **≤760 px:**
    - the photo is 4:5 and the title block sits below it, full width;
    - the digits are `clamp(56px, 22vw, 120px)` and the unit labels sit under each group;
    - the band stacks in the order stats, stage (narrow layout, 4:5), toggles, then schedule;
    - Latest stacks the image above the text;
    - the teaser caption moves below the photo.
- [ ] **Step 2: Check** at 390, 800, 1024 and 1280 in both themes: no sideways scroll, and nothing overlaps.
- [ ] **Step 3: Commit** `feat(weekend): the Race weekend page fits tablets and phones`.

### Task 8: End-to-end

**Files:** Create `e2e/weekend.spec.ts`. Use the `errors` fixture in every test, which brings the season stub and the clock.

- [ ] **Step 1: Write the tests:**
  - loads with no errors, in light and in dark;
  - no hidden text after scrolling to the end;
  - no horizontal overflow at 390 px (`scrollWidth <= 390`);
  - fits at 800, 1024 and 1280 px, with no overlap between the clock and the note, or between the band's stats and its schedule;
  - `?reduced` shows everything with no bars;
  - a 503 shows the waiting line within the loader budget;
  - the countdown ticks (`clock.fastForward`);
  - the calendar button downloads `interlagos-2026.ics` with five `BEGIN:VEVENT`;
  - dragging the stage 200 px moves turn 1's pin, and the reset button brings it back to within 2 px;
  - on the phone project, a vertical swipe on the stage scrolls the page;
  - the Turns toggle hides the pins, and the Sectors toggle hides the S labels;
  - the weekend box's "Race weekend page" link opens `/weekend`.
- [ ] **Step 2: Run** `bunx playwright test e2e/weekend.spec.ts` → all pass. Then run the full suite and record the result.
- [ ] **Step 3: Commit** `test(weekend): end-to-end checks for the Race weekend page`.
