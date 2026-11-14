# Chapter 03, Tyres and strategy: design

## Why

Chapter 02 ships the guide's first replay, and its hero and next-chapter card already promise "Tyres and strategy." with `Soon`. Chapter 03 answers the question a new fan has once they've watched a whole race: why does the order change when nobody passes? The answer is the pit stop. Tyres wear out, a stop costs about 20 seconds, and the team that times it right wins without a move on track.

The bar is the same as for Chapters 01 and 02: landonorris.com and mercedesamgf1.com (Praffi, 2026-11-14).

Everything below that does not come from the approved Figma frames, DESIGN.md, `docs/motion-map.md` or an earlier Praffi decision is **my call**.

## Approaches

These are the three ways of teaching the undercut I considered:

1. **A real undercut, replayed on the broadcast circuit stage.** Praffi said "ok go" to this on 2026-11-14, so it is the one being built.
2. **The mock-era idea: a sample strategy table.** Two invented stints side by side, with no circuit. It is cheap, but it breaks "never invent numbers", and it is the drawn stand-in DESIGN.md rules out.
3. **A lap-time chart of the two cars.** It is true to the data. But it is a chart, and a chart fails "no charts" and the poster rule.

I picked the race, by scanning every 2026 Grand Prix in OpenF1 for undercuts. A candidate counted only if all of these held:

- A was within 3.5 s behind B;
- A pitted first, and B pitted 1 to 4 laps later;
- no safety car or VSC was out over those laps;
- A was ahead two laps after B's stop.

Two candidates fell out:

- **Hungary (HAM on VER):** Verstappen re-passed the next lap.
- **Zandvoort (RUS on PIA):** a slow 5.4 s stop decided it, not the undercut.

**Miami** is the clean one.

## Starting point: the approved Figma frames

Figma `IPkJZWQnY0IKdIjf6Nuugl`:

| Frame | Node | Where |
|---|---|---|
| Desktop light | 360:785 | — |
| Desktop dark | 364:794 | — |
| Phone light | 365:803 | board 131:2 |
| Phone dark | 366:828 | board 135:2 |

Approvals:

- Praffi approved the desktop direction: "yes this direction is met".
- Praffi approved the redesigned phone tower and timeline: "yes works for me".

Top to bottom:

1. **Hero.**
   - Label `How F1 works · Chapter 03 · 7 min`.
   - Nav `← 02 How overtaking works · 04 Flags and what they mean →`.
   - Headline "A race is won / in the pit lane."
   - Intro: "Tyres wear out, and a stop costs about 20 seconds. In Miami this year, the race was decided by who stopped first. Here is that lap."
2. **Full-bleed photo**, `PHOTOS.ch03`.
   - Caption `01 · Pit exit · Suzuka, 2024`: "Verstappen rejoins the track from the pit lane."
   - Credit: Photo Cineyas · CC BY-SA 4.0.
3. **The tyres.**
   - Headline "Three for dry, two for rain."
   - The Pirelli 2026 medium slick photo, captioned `02 · Medium slick · 2026` "The yellow band says medium." Credit: TaurusEmerald · CC BY-SA 4.0.
   - Body: "Pirelli makes five dry compounds, C1 to C5, and brings three to each race…"
   - Five compound rows, each with its colour ring and a `Dry`/`Wet` tag:
     - Soft: "Fastest · wears first"
     - Medium: "The all-rounder"
     - Hard: "Slowest · lasts longest"
     - Intermediate: "Damp track"
     - Wet: "Standing water"
   - A purple facts line: `2026 · 25 mm narrower front · 30 mm rear · C6 dropped`.
4. **What a stop costs · Miami.**
   - A giant `19.5 s` with "The price of new tyres."
   - A body line on pit loss.
   - Source: `Pit loss · MultiViewer estimate for Miami`.
5. **The replay (signature section).**
   - Label `The replay · Miami, laps 26 to 29`. Tag `Miami 2026 · Antonelli undercuts Norris`.
   - Headline "The undercut that won Miami."
   - Body: "Norris led on mediums he had run since the start. Antonelli sat 2.2 s behind on the same tyres. Mercedes called him in first. Scroll to roll it, lap by lap."
   - Two driver cards. Each has a ghost race number, a team colour and a purple chip:

     | Driver | Team | Line | Chip |
     |---|---|---|---|
     | Lando Norris #1 | McLaren, papaya | "Leader · mediums from the start" | `Boxes lap 27` |
     | Kimi Antonelli #12 | Mercedes, teal | "P2 · 2.2 s behind · same mediums" | `Boxes lap 26` |

     Credit: "Both cars in qualifying · Shanghai, 2026 · Photos Liauzh · CC BY 4.0".
   - The Miami broadcast stage, with the whole HUD on the stage:
     - `● Replay · Miami · Lap 27 of 57`;
     - two team-colour car dots with chips, such as `Hard · New` and `Medium · 27 laps`;
     - a dashed `Pit lane`;
     - a step card: "02 New tyres, one lap early." / "Antonelli is out on fresh hards. Norris does one more lap on worn mediums.";
     - a timing tower: Pos · team bar · code · tyre badge (a ring in the compound colour, with the letter) · age · status, with status pills such as `Out-lap` (purple) and `Old tyres`;
     - a 4-segment progress bar: `01 Box first` · `02 New tyres` · `03 Norris boxes` · `04 Out behind`. On a phone the labels shorten to `01 Box` · `02 Tyres` · `03 Norris` · `04 Out`.
   - Footnote: "Positions OpenF1 (unofficial) · Layout bacinger/f1-circuits (MIT) · Elevation SRTM (NASA) · Map © OpenStreetMap contributors (ODbL)".
6. **Two ways to use a stop.** Two rows and a payoff:

   | Label | Name | Line | Tag |
   |---|---|---|---|
   | Stop first | **Undercut.** | "New tyres are faster than worn ones. Stop a lap early and that pace carries you past." | `Tyres wear fast` |
   | Stay out | **Overcut.** | "Run longer in clean air while the other car brings its new tyres up to temperature." | `Tyres slow to warm` |
   | So (purple) | — | — | `In the pit lane` |

   The payoff's copy is corrected under "Copy the data corrects".
7. **The cheap stop.**
   - The safety car photo, Suzuka 2026 (Ysys3455 · CC0).
   - Stats: Racing `19.5 s` · Safety car `12.7 s` · Virtual SC `13.5 s`.
   - Headline "A third cheaper."
   - Body: "Under a safety car the whole field slows, so a stop loses less time. Watch the pit lane fill the moment it comes out."
8. **Words from this chapter.** Chips:
   - Compound
   - Stint
   - Degradation
   - Pit loss
   - Pit window
   - Box box
   - Undercut
   - Overcut
   - Safety car
   - Two-compound rule

   Then `Full glossary →`.
9. **Next chapter.** `Next · Chapter 04 · 4 min`, "Flags and what they mean.", over `PHOTOS.ch04`.
10. The shared footer.

## What the real race says

The data is OpenF1 session 11280: Miami GP, 3 May 2026, meeting 1284, circuit_key 151. I checked it on 2026-11-14.

| Moment | Order (top 5) |
|---|---|
| Lap 26 starts | NOR, ANT (2.16 s behind), PIA, HAM, VER |
| ANT's stop, lap 26 | NOR, PIA, VER, HAM, ANT |
| NOR's stop, lap 27 | PIA, VER, NOR → NOR rejoins P4, right behind ANT P3 |
| PIA stops (lap 28) | VER, ANT, NOR, … VER is off-strategy |
| Lap 29 | ANT passes VER on track and leads. NOR passes VER soon after |

The two stops:

| Car | Stop lap | In-lap | Stop | Lane | Lap after |
|---|---|---|---|---|---|
| ANT | 26 | 97.884 s | 2.2 s | 22.128 s | 105.601 s (out-lap) |
| NOR | 27 | 98.504 s | 2.8 s | 22.565 s | 107.153 s (out-lap) |

- Both cars went from mediums to hards.
- At the start of lap 29, ANT is 0.31 s ahead of NOR. At the start of lap 30, he is 1.17 s ahead.
- ANT won, NOR was 2nd and PIA 3rd.
- There was no safety car or VSC in the window.

### What decided it

The swing was about 2.5 s: Antonelli went from 2.2 s behind at the start of lap 26 to 0.3 s ahead at the start of lap 29.

Most of it came from the pit sequence. Norris's in-lap plus out-lap took 205.7 s, against 203.5 s for Antonelli. Norris also lost more on the stop itself: 2.8 s stationary against 2.2 s, and 22.6 s in the lane against 22.1 s. On a comparable free lap, the new tyres gained Antonelli only about 0.15 s. McLaren's Andrea Stella blamed the in-lap, the stop and the driver. Had Norris matched Antonelli's lane time, he would probably have come out just ahead.

**Praffi chose (2026-11-14) to keep Miami and tell it straight.** The story is that Mercedes stopped first, and McLaren's stop was slower. The lesson is that an undercut is a fight in tenths, and the stop is part of it. The headline "The undercut that won Miami." stays, because stopping first is what gave Antonelli the chance. The page never claims the new tyres alone did it.

### Copy the data corrects

- **The payoff row** says "The lead changed hands without a pass on track." That is false. Antonelli took the lead by passing Verstappen on track on lap 29. What the pit lane did was put him ahead of Norris. The new line: "Antonelli got ahead of Norris without passing him on track." **My call**, for Praffi to check.
- **The replay label** comes from the data window (see below). If the window ends on lap 28, it reads `laps 26 to 28`.
- **The tower** shows real race positions, not "1 and 2". Antonelli drops to P5 after his stop and climbs back. That dip is the cost of a stop, and seeing it is the lesson. The mock's `1 NOR · 2 ANT` is the opening frame of that. **My call.**

## What changes from the mock

### 1. The replay plays the real undercut on the broadcast stage

This is the page's one dense widget (DESIGN.md rule 2).

**The stage.** It is the Miami broadcast circuit (`us-2022`), built 2026-11-14 with the Blender pipeline:

- `blender/circuits/circuit.py` entry: turns from MultiViewer's corner list, and sector cuts from Antonelli's fastest lap;
- the generated `.blend`, `.glb`, posters, pins and lines (untracked on `feat/tyres`).

The layout has 103 points, and the lap is 5415 m (the real lap is 5412 m). Everything about it is the same machinery as the weekend band and Chapters 01 and 02.

**Register Miami as a modelled circuit.** Add `miami` to `MODELLED` and to `CIRCUITS` in `src/circuits/registry.ts`. It needs pins, line, crop, cuts `[0.309, 0.648]`, facts, and `openf1: 'Miami'` (check the exact name OpenF1 uses).

This also gives Miami:

- a lap explorer at `/lap/miami`;
- the pole lap through the existing pole handler;
- the 3D band on its race weekend.

**My call**, because a half-registered circuit would be a second code path. **Check:** `/lap/miami` must render the 2026 pole lap. If the pole pipeline fails for Miami, stop and bring it back.

**The cars are real.** OpenF1 location for both cars (Antonelli 12, Norris 1) is baked from just before Antonelli's in-lap to a few seconds after Norris rejoins:

- **On track,** each sample is projected onto the racing line, so the dot rides the ribbon.
- **In the pit lane,** the dot follows a pit-lane path traced from both cars' location samples in the lane. The path is drawn on the stage as the dashed `Pit lane`, with its entry and exit.

**The transform.** Location is in F1 coordinates. The tool script fits a similarity transform (scale, rotation, offset) from a clean racing lap's location trace onto the layout, the way the 2026-11-14 recon did. That fit had an RMS of 7.6 m, and the script refuses to bake above 10 m.

Locations come at about 3.7 Hz. So the dot positions, the pit-lane entry and exit moments, and the gaps are all interpolated between samples. Gaps are shown to 0.1 s.

**The file.** The window is baked once, by a tool script in the style of `tools/pass.ts`, into a small static JSON committed with the chapter. It is decoded with an Effect schema at load, and it is not KV, because a teaching replay is evergreen (the same call as Chapter 02).

It holds:

- the session, race, year and total laps;
- the pit-lane path;
- for each car:
  - code, name, team and number;
  - position rows over time;
  - lap starts;
  - pit-lane entry and exit times;
  - stop duration;
  - stints (compound and tyre age at the start);
- race positions over the window, for the tower.

**My call** on everything except "baked static file + Effect schema", which follows Chapter 02.

**The four steps come from the data:**

1. **Box first.** Antonelli crosses the pit-lane entry. "`<gap>` s behind Norris, on the same worn mediums. Mercedes call him in."
2. **New tyres, one lap early.** Antonelli leaves the pit lane on hards. Copy as in the mock.
3. **Norris boxes.** Norris crosses the pit-lane entry one lap later. The copy states both stop times from the data, Norris's `<b>` s against Antonelli's `<a>` s.
4. **Out behind.** Norris leaves the pit lane, and Antonelli is already past. "Norris rejoins `<gap>` s behind. Every tenth in the pit lane counted."

**The tower** holds two rows, one per car, ordered by race position. Its columns:

- **Pos:** the real race position at that moment.
- **Team bar and code.**
- **Tyre badge:** a ring in the compound colour, with the letter.
- **Age:** laps on that set, from the stint's age at its start plus the laps run.
- **Status:**
  - `In pit` inside the lane;
  - `Out-lap` (purple) on the lap after a stop;
  - `Old tyres` for the car that has not stopped while the other has;
  - blank otherwise.

**The lap counter** shows the race lap of whichever of the two cars is further round.

**How it moves.** This is the same model as Chapter 02's replay:

- **Pin and scroll.** The section pins, and scrolling drives one time value from the start of the window to the end.
- **Fast-forward.** The window is about 200 s of real race time, so the stretches between steps fast-forward. Each step gets a comparable share of the scroll, and the lap counter makes the jumps legible.
- **Camera.** It holds the whole circuit while the cars run their laps. It pushes in on the pit lane for each step (entry, exit, entry, exit) and pulls back out between them. The camera is driven by the same time value, so scrolling back reverses it.
- **Progress bar.** The 4-segment bar is the slider:
  - `role="slider"`, with value text such as "Lap 27, step 2 of 4, New tyres";
  - ← and → go to the previous or next step, and Home and End go to the ends;
  - dragging moves the same time value.
- **Reduced motion.** Nothing pins and nothing scroll-drives. The replay opens on step 4 with the tower at its final state, and the bar and keys still work.
- **Phone.** It follows the approved phone frames. The stage's HUD stays on the stage (Praffi's rule), with the map on top fading into the tower and step card below it, inside one stage block.
- **No WebGL.** The stage falls back to the Miami poster still, as the weekend band does. The tower, step card and bar keep working over it, with the dots drawn on the HTML overlay.

**My call** on the pin length, the scroll-to-time mapping and the camera framings.

### 2. The words work inline

Chapter 01's term mechanism is reused: the chips, inline terms, and one list of definitions in `src/chapter/words.ts`. These are the ten terms above. The definitions are written in the guide's voice, short and plain, and checked against the 2026 rules. `Full glossary →` stays `Soon`.

### 3. Wiring the guide in

- **Route** `/chapters/tyres-and-strategy`, with page title "Tyres and strategy · Lights Out". **My call**, matching the chapter's title as `/chapters/race-weekend` does.
- **The hero nav:**
  - `← 02 How overtaking works` links to Chapter 02;
  - `04 Flags and what they mean →` shows `Soon`.
- **Chapter 02** now links here, from its hero nav (`03 Tyres and strategy →`) and from its next-chapter card (`to` set).
- **Home** row 03 and the Menu's How F1 works · 03 link here, through `CHAPTERS[2].to`.
- **The next-chapter card** shows Chapter 04, with `Soon`.
- **Reading time:** 7 min.
- **Not in scope:**
  - Chapter 04;
  - the glossary page;
  - the How F1 works index;
  - Home's "Why one pit stop can win a race." story card. It stays as it is; whether it should point here is a later call.

## Page order (light theme)

Hero (paper) → pit exit photo → the tyres (paper) → what a stop costs (paper) → the replay (dark band, the signature) → two ways to use a stop (paper) → the cheap stop (paper) → words → next chapter → footer.

In the dark theme, everything is tarmac, and the band inverts to paper around the dark stage, as the approved dark frame draws it.

## Rules that apply

- **Every section is a poster:** one image or one number, a headline, a caption. There is one dense widget, the replay.
- **Photos:** each has a caption block with place and year, plus its Commons credit. Only CC0, CC BY, CC BY-SA or public domain. No F1, FIA, Pirelli or team logos as graphics.
  - The Pirelli medium and the Suzuka safety car photo must be found on Commons and their licences checked.
  - The driver cards reuse `public/img/cars/nor.webp` and `ant.webp` (Liauzh · CC BY 4.0). Check that both were taken in Shanghai 2026 qualifying, as the caption says.
- **Motion** follows `docs/motion-map.md`, with one ease family (`launch`, `brake`):
  - the hero headline sweeps, then the label;
  - photos arrive behind the bar and drift;
  - paragraph groups fade up 24 px;
  - the compound rows and the two-ways rows rise, and the payoff fills purple last;
  - the giant `19.5 s` and the stat row arrive behind the bar;
  - the next-chapter photo wipes up.

  Nothing counts up.
- **Reduced motion:** nothing stretches or blurs, nothing stays hidden, and nothing pins.
- **Themes and sizes:** both themes, and phone at 390 px with no horizontal overflow. The phone frames are the reference.
- **Text and data stay real HTML.**
- **Code:**
  - no comments;
  - no `as` casts except `as const`;
  - no `any`;
  - no non-null `!`.

  `bun run lint` passes.

## Facts to verify before ship

**This check runs first, before the replay logic is built.** A wrong fact changes copy or a constant. If the story itself does not hold, stop and bring it back to Praffi.

**The 2026 tyres** (from press coverage on 2026-11-14):

- five dry compounds, C1 to C5, with three brought to each race;
- C6 dropped;
- 18-inch rims;
- fronts 25 mm narrower, rears 30 mm narrower;
- intermediate and full wet.

Confirm against Pirelli's 2026 material and the FIA regulations.

**The two-compound rule.** Does the rule that a dry race must use two different dry compounds still apply in 2026, and does Miami 2026 match it? The chip and its definition depend on it.

**Pit loss.** The Miami numbers (19.5 s racing, 12.7 s under safety car, 13.5 s under VSC) are MultiViewer estimates. They are labelled as such on the page, and "about 20 seconds" and "A third cheaper" follow from them. Cross-check them against one more source, such as Pirelli's or F1's race preview.

**The Miami story:**

- ANT pitted on lap 26 and NOR on lap 27;
- the stop times;
- NOR rejoined behind ANT;
- ANT took the lead from VER on track on lap 29;
- VER's strategy.

Confirm these against a race report. Some reports put the gap at the stop at 1.7 s, not 2.2 s. The page uses the data's number at the moment of the step.

The bake script also times both cars at fixed points on the track, from the location data, and prints where the swing came from: tyres, stop and lane. If it contradicts "stopped first, slower McLaren stop", stop and bring it back to Praffi.

**The Miami circuit facts** for the registry: 5.412 km, 57 laps, the race distance, 19 turns, and the direction.

## Proof before PR

- **Unit tests (pure functions):**
  - the four step times and their numbers from the baked file (gap at entry, both stop times, gap at rejoin);
  - tyre age and status at any time;
  - race order at any time;
  - mapping a time to a track or pit-lane position;
  - previous and next step;
  - decoding the baked file;
  - the transform fit refusing a trace above 10 m RMS.
- **Playwright:**
  - the chapter renders in both themes at 1440 and 390, with no horizontal overflow;
  - scrolling through the pinned replay moves the dots, lights the steps in order and reaches step 4, with the tower showing NOR behind ANT;
  - ← → / Home / End and dragging the bar move the replay and update the value text;
  - reduced motion opens on step 4, unpinned;
  - Chapter 02's nav and next card reach this page;
  - a term chip opens its definition;
  - `/lap/miami` renders.
- **A bar check against the references, done in the browser by me, not delegated,** after the page and again after the replay is built:
  - landonorris.com and mercedesamgf1.com, section by section;
  - the 7 rules in DESIGN.md;
  - no drawn stand-ins;
  - no two neighbouring sections share a layout.
- **Checks:** `bun run lint` and the project's checks pass. Live screenshots for Praffi.
- **Review:** sol-loop before any PR. No council.

## Left to the builder

- The tool script's name, where the baked file and the chapter code live, and the file's exact encoding.
- How the pit-lane path is derived (for example, the mean of both cars' lane traces), and how the stage detects lane entry and exit (distance from the racing line, the pit record, or both).
- Sharing Chapter 02's stage HUD, pin and slider code with this chapter, where that removes duplication rather than adds abstraction. Chapter 02's `Replay.tsx` and `PassHud.tsx` must not change behaviour.
- The exact body copy and term definitions, in the mocks' voice.
- The pin length, the scroll-to-time mapping, the camera framings, and the phone stage proportions within the approved frame.
