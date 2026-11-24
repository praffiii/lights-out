# Chapter 07, Defending: design

## Why

Chapter 02 teaches how a pass works. A new fan's next question is the other half: what may the car in front do about it, and why did that driver get a penalty? Chapter 07 answers with the one-move rule, a real fight for the lead, the switchback, the divebomb rule and the price list. It also covers the penalty ladder, which no chapter covers today.

- Praffi asked for it on 2026-11-24 ("ok start that"), with the new numbering (07 Defending, 08 The two championships, 09 DRS) and the penalty ladder folded in.
- The bar is the same as for Chapters 01 to 06: landonorris.com, mercedesamgf1.com and the 7 rules in DESIGN.md.
- Success: after reading, a newcomer can say what one move means, who is owed room in a corner, and what breaking the rule costs.

Anything below that is not in the approved frames, DESIGN.md, an earlier spec or a Praffi decision is **my call**.

## Goals, non-goals, anti-goals

- **Goals:** the chapter page at desktop and phone, in both themes; one real, scroll-driven replay; two clay stills; the words; the wiring of the guide to seven chapters.
- **Non-goals:**
  - the Suzuka model and its track page;
  - Chapters 08 and 09, and the How F1 works index;
  - the track-limits story from the retired "Penalties and track limits" mock (Chapter 04 covers track limits);
  - a live 3D switchback.
- **Anti-goals:**
  - claiming a driver's line across the road, which OpenF1 cannot measure;
  - a replay that feels like Chapter 02 again, with stepped zooms or a cluttered stage;
  - an invented number.

## Approaches

What the signature section is:

1. **A real fight.** Melbourne 2026, laps 8 to 9, Russell against Leclerc for the lead, on the Albert Park stage. The switchback is a smaller clay drawing. **Praffi picked this (2026-11-24).**
2. **A live 3D switchback at Suzuka Turn 11.** It teaches the move best, but it is invented and needs a new circuit.
3. **Both at full size.** Two dense widgets on one page break rule 2.

How the switchback is drawn:

1. **A still Blender render with HTML labels.** Light, and the fight stays the page's only scroll-driven moment. **Praffi picked this (2026-11-24).**
2. **Live 3D, scroll-driven.** A second pinned scene straight after the first.

Where the fight's data lives:

1. **Baked once into the repo**, like the Chapter 02 pass and the Monza run. A teaching replay is evergreen. **My call.**
2. **KV and the hourly workflow.** It would refresh something that never changes.

## Starting point: the approved Figma frames

Figma `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks". Praffi approved all four on 2026-11-24.

| Frame | Node |
|---|---|
| Desktop light | 489:1109 |
| Desktop dark | 492:1118 |
| Phone light | 494:1127 |
| Phone dark | 494:1388 |

They replace the 2026-11-08 "Chapter 06 · Defending and the switchback" mocks (228:560, 231:569, 232:20, 233:38). Where this spec and a frame disagree, this spec wins. The differences are: the strip runs to 96 s, not 100; the last frame is 96 s; the chips list is corrected; one price line is softened; the footer and header are the shipped ones.

## Page order

1. **Hero.**
   - Label `How F1 works · Chapter 07 · 6 min`.
   - Nav `← 06 The power unit · 08 The two championships`, the second marked `Soon`.
   - Headline "One move to defend. / Then it's a race."
   - Intro: "The car in front may block a pass, but only once. Here is the rule, a real fight for the lead, and what it costs to cheat."
2. **Full-bleed photo.** Hamilton's Ferrari beside Russell's Mercedes, Silverstone 2026. Caption `01 · Pit straight · Silverstone, 2026`: "Hamilton's Ferrari alongside Russell's Mercedes." Credit: Photo Jason Puddephatt · CC BY-SA 4.0, via Wikimedia Commons. The file is one of four `Lewis Hamilton George Russell F1 Cars (…).jpg` on Commons; the builder matches it to the Figma fill, and serves 1400w and 2800w like `ch06`.
3. **The rule.** See [The rule](#the-rule).
4. **The fight.** The signature. See [The fight](#the-fight).
5. **The reply.** See [The reply](#the-reply).
6. **The divebomb.** See [The divebomb](#the-divebomb).
7. **The price.** See [The price](#the-price).
8. **Words from this chapter.** See [Words](#words).
9. **Next.** The `Next` card with `to={null}`: `Next · Chapter 08 · 6 min`, "The two championships.", line "One for drivers, one for teams", marked `Soon`. Photo: the Melbourne 2026 podium (Photo Yu Chu Chin · CC BY-SA 4.0), matched to the Figma fill in Commons' "Podium celebration at the 2026 Australian Grand Prix" set.

## The rule

- Label `The rule`, a giant poster "1", headline "One move. / No more."
- Body: "A driver may change direction once to defend a place. If that took them off the racing line, they may come back toward it, but must leave a car's width to the edge of the track."
- Rows:

  | Label | Word | Line | Tag |
  |---|---|---|---|
  | Defending | One move. | Cover the inside or the outside, once, and hold that line into the corner. | Allowed |
  | Coming back | A car's width. | Moving back toward the racing line, leave at least one car's width to the edge of the track. | Allowed |
  | Never (purple payoff) | A second move. Or any swerve after the brakes go on. | | Not allowed |

- Source line: `FIA F1 Driving Standards Guidelines, 26 February 2026, G and H · International Sporting Code, Appendix L, Chapter IV, 2b · After braking starts, only the racing line may be followed`.

## The fight

### The data

Verified on 2026-11-24 from OpenF1 session 11234 (Australian Grand Prix, 8 March 2026), drivers 63 (Russell, Mercedes) and 16 (Leclerc, Ferrari). Laps 7, 8 and 9 of both cars fit the Albert Park model with the existing `alignLap`.

- The clock's zero is Leclerc's lap 8 start. The window is 0 to 96 s (**my call**: both cars are then out of Turn 2 with Leclerc about 19 m ahead, so the last frame is also the reduced-motion frame).
- Position `u` runs on: lap 8 is 0 to 1, lap 9 is 1 to 2, lap 7's tail is below 0.
- The lead changes:

  | # | About | Where | New leader | In the data |
  |---|---|---|---|---|
  | 1 | 12.9 s | before Turn 3 | Russell | 298 against 261 km/h |
  | 2 | 46.8 s | the straight to Turn 9 | Leclerc | 320 against 295 km/h |
  | 3 | 89.8 s | Turn 1, lap 9 | Russell | 1 to 3 m ahead, inside the error |
  | 4 | 91.9 s | Turn 1 exit, lap 9 | Leclerc | at 93.5 s: 188 against 159 km/h, 13 m ahead |

- **Change 3 leans on race reports.** Sky Sports: at the start of lap 9 Russell dove down the inside into Turn 1 but "locked up and could not get his car slowed down in time", and Leclerc "nipped back through on the exit to lead again". Formula1.com also reports the lock-up. The credit line says `Lock-up: race reports`.
- **What the data cannot show:** which side of the road a car used, or whether a driver moved to defend. No copy in this section claims either. The word "inside" does not appear in it.

### The file

- `tools/fight.ts` fetches and aligns the laps with the repo's OpenF1 client and `alignLap`, and writes `src/fight/melbourne.json`. It follows `tools/pass.ts`: run by hand, `--out` to write.
- Shape: `session`, `race`, `year`, `laps` (`[8, 9]`), `lengthM`, and `cars`, a pair of `{ code, name, team, rows }` with rows `[t, u, speed, gear, throttle, brake]`. The `Car` struct in `src/pass/schema.ts` is reused. An Effect schema decodes the file.
- `t` is rounded to a millisecond. A reading outside 0 to 100 for throttle (OpenF1 returns 104 at times) is clamped to 100 in the tool.

### The model

Pure functions in `src/fight/model.ts`:

- `leads(file)`: the stretches of who leads, from the difference in `u`. A new leader must hold for at least 1 s to count, so noise cannot add a change. It must give exactly the five stretches above.
- `steps(file)`: four steps, at the four changes.

  | n | Title | Text |
  |---|---|---|
  | 1 | Russell dives | "298 against 261 km/h on the run to Turn 3. Russell takes the lead." |
  | 2 | Leclerc answers | "320 against 295 km/h on the straight to Turn 9. Leclerc is back in front." |
  | 3 | Too deep | "Turn 1, next lap. Russell dives again, brakes too late and locks up." |
  | 4 | The cut-back | "Leclerc is on the power first, carries more speed off the corner and leads again." |

  The speeds in steps 1 and 2 are read from the data at the change, not typed, so they may differ by 1 km/h from the numbers above. The mock's step 4 text says Russell locks up; that moved to step 3, where it happens.
- `readout(file, t)` per car: speed, gear, throttle cells and brake, and the gap: `Leader` for the car in front; for the car behind `Level` under 5 m, otherwise `+<n> m`. **My call** on 5 m: it is about the error.
- `stepAt`, `sliderText`, with the same shape as Chapter 02's.

### The stage

- The broadcast `CircuitStage` for `au-1953`, dark in both themes, with a pinned scrub, like Chapter 02. The pin fits one viewport on every size.
- **One continuous camera.** It opens on the whole circuit, pushes in to a chase of the two cars' midpoint by Turn 3, and stays with them round the lap. It tightens through Turn 1 on lap 9 for changes 3 and 4, then holds. It is driven only by the time value, so scrubbing back plays it back. No cuts, no stepped zooms.
- **The road ahead:** turn chips only for 1, 3 and 9, plus 2 if it stays clear. No sector glyphs, no detection mark, no Turns or Sectors toggles.
- **The cars:** two dots in team colours (`TEAMS`), with trails and tags `RUS` and `LEC`, on the model's line. When they are within a car length they sit side by side across the ribbon, as in Chapter 02. This is a drawing aid, and not a claim about lines.
- **HUD on the stage, at every size:**
  - Title block: label `Replay · Albert Park · Laps 8 to 9` with the red dot, headline "Four lead changes. / Eighty seconds.", and `Australia 2026 · Russell v Leclerc · for the lead` (phone: `Australia 2026 · For the lead`). As in Chapter 02, it gives way once the replay starts (**my call**).
  - A gap chip near the cars, with the same text as the board.
  - The step card: a purple number block, title and text.
  - The board: Car, km/h, Gap, Gear, Throttle. The leader's row is on top and swaps when the lead changes.
  - **Who leads:** a bar in team colours, one stretch per leader, linear in time from 0 to 96 s, with a white playhead and four numbered pins, the current one purple. Desktop pins carry captions (`Dive · Turn 3`, `Straight to Turn 9`, `Dive · Turn 1 · locks up`, `Cut-back`); the phone has one line under them, `1 Turn 3 · 2 Turn 9 · 3 Turn 1 · 4 Exit`. Codes sit inside stretches that are wide enough.
- **Phone:** the map is on top, fading into the HUD. Nothing moves below the stage onto the page.
- Credit under the stage: `Telemetry: OpenF1 (unofficial), about four samples a second · Map © OpenStreetMap contributors (ODbL) · Layout bacinger/f1-circuits (MIT) · Elevation SRTM (NASA) · Lock-up: race reports`.

### How it moves

- `useScrub` with `stepPace`: the four changes share the scroll evenly, so the two seconds between changes 3 and 4 play in slow motion and the quiet stretches go by faster. **My call.**
- The bar is linear in time while the scroll is not, so `useScrub` gains one option, a `scale` for mapping a pointer on the slider to time. It defaults to the pace, so Chapters 02, 03, 05 and 06 stay exactly as they are and their e2e stays green unchanged.
- The bar is the slider: `role="slider"`, value in seconds, text like "91.9 s, step 4 of 4, The cut-back, Leclerc leads". ← → step between changes, Home and End work, and dragging seeks.
- **Reduced motion:** nothing pins and no camera moves. The stage rests on 96 s with all the steps listed, and the slider and keys still work.
- **No WebGL or a failed load:** the circuit's own poster, as the other stages do, and the HUD still works.
- Rendering pauses off screen and in a hidden tab.

### The crack at Turn 1

Zoomed in, the Albert Park road shows a small dark crack on the inside of Turn 1, because the ribbon's inner edge folds over itself where the corner is tighter than half the road's width.

- Fix it at its source, in the ribbon code in `blender/circuits/circuit.py` (and the strips in `broadcast.py` if they fold too), then rebuild `au-1953` only.
- **Blast radius:** Albert Park's glb and posters, which Home, `/weekend` and `/lap/albert_park` use. `src/circuits/lines/au-1953.json` and `src/circuits/pins/au-1953.json` must come out identical. `au-1953-inset.webp` is rebuilt with `inset.sh` and its json must also be identical. Other circuits are not rebuilt.
- If the live stage does not show the crack at the camera's closest, skip the rebuild and say so in the PR.

## The reply

- Label `The reply`, headline at mega size "Too fast in. Second out.", body: "The answer is called the switchback. Let the diver go deep, brake in time, turn late and drive off the corner sooner. At Turn 1, Leclerc was back ahead by the exit."
- A full-width Blender still on the page background: a hairpin with two clay cars and their two lines. The attacker's line is ink and runs wide; the defender's is purple and cuts inside.
- HTML chips from Blender-projected pins: `Stays outside`, `Dives inside`, `Defender · on power first`, `Attacker · runs wide`. The phone keeps the last two.
- Credit: `A drawing of the technique, not telemetry · Cars drawn larger than life · Car: MaG80, CC BY 4.0, rendered in Blender`.

## The divebomb

- Text left, image bleeding off the right edge; on the phone the image is full width and the cars point up.
- Label `The divebomb`, headline "Alongside / the mirror.", body: "To be owed room on the inside, the attacker's front axle must be level with the other car's mirror, before the apex and at it. Arrive later and it is a divebomb."
- A top-down clay still: the purple defender, the pale attacker, and one line through the defender's mirrors and the attacker's front axle. Chips `Mirror` and `Front axle`.
- Rows: `Inside` (phone `Inside · before and at the apex`) "Front axle level with their mirror."; `Outside` (phone `Outside · at the apex`) "Front axle ahead of their front axle."
- Credit: `FIA F1 Driving Standards Guidelines, 26 February 2026, A and B · Car: MaG80, CC BY 4.0, rendered in Blender`.

## The stills

- `blender/car/duel.py`, ported from `lights-out-private/defending-2026-11-24/clay.py` without comments, reading `car.blend`. It renders to `public/defend/`: `switch` and `dive`, each in light and dark, each for desktop and phone (8 files). `switch` is transparent, so it sits on the page.
- WEBP, each under 200 KB. The `pins` go to `src/fight/pins.json` in 0–1 image coordinates, from the same cameras.
- `blender/car/build.sh` runs it with the rest.
- The road, clay and line colours are the ones in `clay.py`, which made the approved renders.

## The price

- Label `The price`, headline "Defend too much, and pay."
- Three giant numbers; the last is a purple block bleeding off the right edge (phone: full width):

  | Number | Unit | Title | Line |
  |---|---|---|---|
  | 5 | Seconds, or more | A second move to block. | Anywhere from five seconds up to a drive-through, and up to three penalty points. |
  | 10 | Seconds, as a rule | Pushing a car off. Causing a crash. Cutting a corner to stay ahead. | |
  | 12 | Penalty points in 12 months | Sit out the next race. | As a rule, points now come only for dangerous, reckless or deliberate driving. |

- Two rows: `First swerve` "Black-and-white flag. A warning, if it was not dangerous." `Braking zone`; `Served` "Stopped at the next pit stop, or added at the flag." `5 s · 10 s`.
- Source: `FIA F1 Penalty Guidelines 2026 v01 · FIA F1 Sporting Regulations, issue 07, B1.9.5 and B1.9.6`, plus the source that confirms the 12-point rule.
- The numbers count up once on arrival, like the car stats on Home (**my call**).

## Words

Reused: `brakingZone`, `trackLimits`, `blackWhiteFlag`. New (definitions are drafts for Praffi's fact-check):

- `defending`: Defending. Placing your car to make a pass harder. One change of direction is allowed.
- `racingLine`: Racing line. The fastest path through a corner, from the outside, to the inside, to the outside again.
- `switchback`: Switchback. Letting a late braker slide past, then turning back inside them to lead out of the corner.
- `divebomb`: Divebomb. A late lunge up the inside from too far back.
- `apex`: Apex. The innermost point of the line through a corner.
- `carsWidth`: Car's width. The room a defender must leave when moving back toward the racing line.
- `stewards`: Stewards. The officials who judge incidents and hand out penalties.
- `penaltyPoints`: Penalty points. Marks on a driver's licence for dangerous driving. Twelve in a year means missing a race.
- `driveThrough`: Drive-through. A penalty: drive the length of the pit lane at the speed limit without stopping.

`DEFENDING_WORDS` order: defending, racingLine, switchback, divebomb, apex, brakingZone, carsWidth, trackLimits, blackWhiteFlag, stewards, penaltyPoints, driveThrough. **My call:** the mock's "Overtaking" chip is dropped (it is Chapter 02's subject), and "Off the track" becomes the existing `trackLimits`.

Inline terms: `racingLine` and `carsWidth` in the rule body, `switchback` in the reply, `apex` and `divebomb` in the divebomb body, `driveThrough` in the price. A term's popover must stay above its neighbours, as Chapter 06 had to fix.

## Wiring the guide in

- Route `/chapters/defending` (`src/routes/chapters.defending.tsx`), title `Defending · Lights Out`, a one-line description, `chapterCss` plus a new `defending.css`. Prerendered like the other chapters.
- Page `src/chapter/Defending.tsx`, with the fight in `src/chapter/Fight.tsx` and `FightHud.tsx`, following `Overtaking.tsx`, `Replay.tsx` and `PassHud.tsx`. Share code with them only where it removes duplication.
- `CHAPTERS` gains `{ n: '07', title: 'Defending', min: 6, photo: PHOTOS.ch07, to: '/chapters/defending' }`. Home derives "Seven chapters · 41 min". The glossary's `LISTS` gains `DEFENDING_WORDS`.
- Chapter 06 is no longer last: its nav becomes `← 05 Inside the car · 07 Defending →`, and its `NextRace` becomes a `Next` card: `Next · Chapter 07 · 6 min`, "Defending.", line "One move, and what it costs to make two", `PHOTOS.ch07`.
- Chapter 02's nav and Next card stay.
- `PHOTOS` gains `ch07` and `ch07Podium` with `source`; `src/credits/photos.ts` lists where each shows.
- The menu's chapter list grows to seven. It must still fit, with the theme switch on screen at the sizes the existing e2e checks.
- e2e checks that assert six chapters change to seven.

## Rules that apply

- The 7 rules: every section a poster; the fight is the one dense widget; every photo captioned and credited; the circuit is the dark broadcast screen in both themes (so the dark page has no background shift); no repeated blocks.
- Motion from `docs/motion-map.md`: hero sweep, photo behind the bar, paragraphs fade up 24 px, rows rise and the payoff row fills purple last, chips appear one at a time. `launch` and `brake` only. The motion map's switchback row ("pinned and scrubbed") is updated to the still.
- Reduced motion, both themes, and 390 px with no horizontal overflow.
- Text and numbers are real HTML.
- No code comments (Python included), no `as` casts except `as const`, no `any`, no non-null `!`. `bun run lint` passes.
- Commons CC0, CC BY, CC BY-SA or public-domain photos only. No F1, FIA or team logos as graphics. No synthesized sound.
- Zero cost: no new Worker route, no KV, no third-party call at runtime.
- DESIGN.md gets a short "The fight (Chapter 07)" entry, and spec §8 of the fan-site design notes that 07 shipped.

## Facts to verify before ship

Praffi signs these off before merge:

- **12 points in 12 months means a one-race ban**, against the International Sporting Code's Appendix L. News sources agree; the FIA text was not found. If it cannot be confirmed from the FIA, the purple block keeps the claim and cites the best source.
- **Penalty Guidelines 2026 v01:** second change of direction, 5 s up to a drive-through, up to 3 points; moving in the braking zone, black-and-white flag possible for a first offence; forcing off and causing a collision, 10 s baseline; leaving the track and keeping a position, 10 s baseline.
- **Sporting Regulations issue 07 (25 June 2026):** is it still the current issue?
- **Driving Standards Guidelines, A, B, G, H:** the wording above.
- **The fight:** the four changes, their order and laps, and the lock-up, against a second report or the broadcast.
- **Photos:** each file, place, author and licence.

## Proof before PR

- **Unit tests (pure):** `leads` on the real file gives five stretches and four changes within 75 to 85 s; a half-second flicker does not count; `steps` carries the data's speeds; `readout` gap text before, at and after a change, including `Level`; `sliderText`; the file decodes; `useScrub`'s `scale` default.
- **Playwright**, both themes at 1440 and 390: loads with no errors and no horizontal overflow; scrolling lights steps 1 to 4 in order and swaps the board's top row; keys and dragging move the bar to the right time (the linear scale); reduced motion rests on the last frame, unpinned; nav links, Chapter 06's links, Home's seven chapters and the menu; a term opens.
- Existing chapter, lap, weekend and Home specs stay green.
- **A bar check in the browser, by me:** against landonorris.com and mercedesamgf1.com, after the stage and again at the end, at 1440 and 390.
- `sol-loop` before the PR. No council (Praffi's standing choice). Push and PR only on Praffi's word.

## Left to the builder

- The camera's numbers, the trail lengths, where chips sit, and how the HUD shares styles with Chapter 02.
- Exact class names and file splits inside the paths above.
- How the ribbon fold is fixed.
