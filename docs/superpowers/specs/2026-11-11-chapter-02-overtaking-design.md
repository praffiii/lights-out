# Chapter 02, How overtaking works: design

## Why

Chapter 01 shipped on 2026-11-11 (PR #12), and its last card already promises "How overtaking works." with `Soon`. Chapter 02 is the next page of the guide. It answers the question a new fan has after their first race: why do passes happen where they happen? It is also the first racecraft chapter, and the original spec names "animated top-down replays that visitors can scrub through" as how racecraft is taught.

As with Chapter 01, the aim is to ship before the Las Vegas weekend (19–21 Nov 2026), but the bar comes first.

Praffi asked for "the same approach like we build chapter 01" on 2026-11-11, which skips the question round. Everything below that is not quoted from DESIGN.md, `docs/motion-map.md`, the Figma mock or an earlier Praffi decision is **my call**.

## Starting point: the approved Figma mock

Figma `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks", frames "How overtaking works — light" (node 39:2) and "— dark" (39:54). There is no phone board for this chapter. Top to bottom:

1. **Hero.**
   - Label `How F1 works · Chapter 02 · 5 min`.
   - Chapter nav on the right: `← 01 A race weekend · 03 Tyres and strategy →`.
   - Headline "Every pass starts long / before the corner."
   - Side line: "A pass is planned a whole straight before it happens. Get within a second, use the battery, get out of the wake, brake later. Here is one, slowed down."
2. **Full-bleed photo**, `PHOTOS.ch02`, with this caption block:
   - `01 · Main straight · Baku, 2026`
   - "The chaser closes down the 2 km straight."
   - Credit: Photo Press Service of the President of Azerbaijan · CC BY 4.0.
3. **One move, three frames.**
   - Label `One move`, headline "One move, / three frames."
   - Side line: "Malaysia, 2017. Verstappen used DRS down the main straight, drew alongside and took Turn 1 on the inside. The 2026 rules removed that tool, so the same move now needs a different one."
   - One big photo and two small ones, captioned:
     - `01 · The straight`: "Side by side at full speed. Sparks off the floor."
     - `02 · Turn 1`: "Verstappen goes past Hamilton on the inside."
     - `03 · The exit`: "Turn 1 done. Verstappen leads."
   - Credit line "Photos Morio · CC BY-SA 4.0, via Wikimedia Commons".
4. **The replay (signature section, inverted).**
   - Label `The replay · Interlagos, Turn 12 to Turn 1`, with `Sample data` on the right.
   - Headline "About 1.2 km / to make it stick."
   - Side line: "The same idea at Interlagos under the 2026 rules, on the real track and slowed down. Two cars, one straight, four steps. Drag the timeline to replay it."
   - A map of the whole circuit, with the stretch from Turn 12 to Turn 1 dashed in purple, a `Detection` mark after Turn 12, labelled turns (12 · Junção, 13, 14, 15, 01 · S do Senna, 02) and `Start / finish`. Two dots, `Chaser` (purple) and `Leader` (white). Four numbered callouts:
     1. "Within one second": "0.6 s behind at the detection point. That unlocks Overtake Mode for the straight."
     2. "Overtake Mode": "Extra electric power, for longer, all the way up the hill."
     3. "Out of the tow": "Clean air, nose alongside."
     4. "Brake later": "Inside line for Turn 1, braking a few metres after the leader."
   - A corner note: `Flat out from Junção to Turn 1 · about 1.2 km`.
   - Under the map, a readout table: Car · Speed · Gap · Gear · Mode · Battery, one row each for Chaser and Leader.
   - Then a timeline: `0.0 s` to `17.0 s` with a handle, and the four step pins under it.
   - Hint: "Drag the timeline, or use ← → to step through it."
5. **The air.**
   - Label `The air`, headline "The same air helps, / then hurts."
   - Side line: "A car punches a hole through the air. Behind it on a straight, that hole is a gift. In a corner, it is a curse."
   - A wide photo of two Haas cars with three callout chips: `Leader · punches the hole`, `Chaser · in its tow`, and `The pocket · less drag` (with a bracket).
   - Caption `04 · The tow · Spa-Francorchamps, 2026`: "Two Haas cars, nose to tail." Credit: Photo Der Alf · CC BY 4.0.
   - Then three rows:
     - `On a straight` · **Tow.** · "The leader leaves a pocket of slow air. Less drag, so the chaser gains speed without using more power." · `Helps`
     - `In a corner` · **Dirty air.** · "The same wake is now turbulent. The chaser's wings lose grip, the car slides and the tyres overheat." · `Hurts`
     - A purple payoff row: `So` · **Most passes happen at the end of a straight.** · `Not in a corner`
6. **The 2026 rules.**
   - Label `The 2026 rules`.
   - A giant ghost-grey "DRS" with a black strike bar across it, captioned `Drag Reduction System · 2011 to 2025`.
   - Headline "Gone in 2026." with side line: "For fifteen seasons a flap in the rear wing opened for the chasing car. Now every car opens its wings on the straights, so the chaser's edge comes from the battery instead."
   - A table: Tool · What it does · Who gets it · Where.

     | Tool | What it does | Who gets it | Where |
     |---|---|---|---|
     | DRS (`Until 2025`, greyed) | Opens a flap in the rear wing | Chaser only, within 1 s | DRS zones |
     | Straight mode | Opens the front and rear wings | Every car | Long straights |
     | Overtake Mode (`New`, purple) | Extra electric power, for longer | Chaser only, within 1 s | After the detection point |
7. **Words from this chapter.** Chips: Tow, Slipstream, Dirty air, Detection point, Overtake Mode, Straight mode, Active aero, Braking zone, Inside line, DRS · until 2025, plus `Full glossary →`.
8. **Next chapter.** A full-bleed photo, `PHOTOS.ch03` (Verstappen leaves the pit lane, Suzuka, 2024 · Photo Cineyas · CC BY-SA 4.0), with a caption card:
   - `Next · Chapter 03 · 7 min`
   - "Tyres and strategy."
   - "Why one pit stop can win a race →"
9. The shared footer.

The mock was drawn on 2026-11-07. That was before the broadcast circuit stage and the pole-lap replay shipped, and its map is a Blender still with sample data. This design keeps the mock's structure and copy, and replaces the sample with a real pass on the stage the site already has.

## What changes from the mock

### 1. The replay shows a real pass, on the broadcast stage

This is the page's one dense widget (DESIGN.md rule 2).

**The stage.** It is the same broadcast circuit the weekend band and Chapter 01 use: Interlagos (`br-1940`), with its dark map, glowing ribbon and turn pins. **My call**, and it follows two Praffi decisions:

- "Racecraft replays are a live-timing map, not 3D": two dots move along the real layout, beside the telemetry (DESIGN.md).
- The broadcast circuits replaced flat maps (2026-11-09).

**The camera pushes in, the way a broadcast does.** At full-circuit framing the two cars are dots about 14 px apart, so "nose alongside" and "brake later" would be invisible. Praffi agreed on 2026-11-11 that this falls below the bar. DESIGN.md's replay notes also say the map frames the Turn 12 → Turn 1 stretch. So:
- The replay opens on the whole circuit, as the mock draws it, so the visitor sees where the stretch is.
- As the replay starts, the camera does a long-lens push-in from the stage's own oblique angle. It is a zoom and pan of the same view, not a new camera path. It follows the midpoint of the two cars from Turn 12 up the hill.
- It holds tight on Turn 1 for "Brake later". At that zoom the gap between the two braking points reads as real distance on the track.
- The push-in is driven by the same time value as the cars, so scrubbing back pulls the camera back out.
- With reduced motion, the camera jumps between framings with no tween.
- On a phone the push-in matters even more, and it uses the same rule.

On top of the stage:

- The Turn 12 → Turn 1 stretch is dashed in purple.
- A `Detection` mark sits at the exit of Turn 12. It draws in purple when the chaser crosses it (motion map, "Overtaking replay map").
- Only the turn pins the story uses are shown: 12 · Junção, 13, 14, 15, 1 · S do Senna and 2, plus `Start / finish`.
- There are two dots: the chaser (purple) and the leader (white). Each is labelled with its role and three-letter code, for example `Chaser · HAM` and `Leader · LIN`.
- When the dots are within a car length of each other, they are drawn side by side across the ribbon, so "alongside" reads at map scale. The spike drew lanes four times their real width for the same reason.
- The four callouts sit where the mock puts them. The current step's callout is lit, and the others dim.
- The weekend band's Turns and Sectors toggles, its hover-to-scrub and its click-through to the lap explorer are not part of this stage.

**Theme.** The replay section is always the dark broadcast screen, in both themes. The dark mock (39:54) draws this section as paper, because it predates DESIGN.md rule 7's circuit exemption ("circuit sections … are always the dark broadcast screen"); the exemption wins. So on the light page this section is also the opposite-theme signature. On the dark page, no section changes background. **My call.**

**The pass is real.** The data is a real pass into Turn 1 at the 2026 São Paulo Grand Prix (session 11412, 8 Nov 2026), from OpenF1:

- position along the track, aligned to the model with the pole lap's `alignLap`;
- speed, gear, throttle and brake per car.

The label `Sample data` becomes the pass's name, for example `São Paulo 2026 · Lap 29 · HAM on LIN for P9`. The credit line is the stage's credit plus `Telemetry: OpenF1 (unofficial)`. **My call.** It follows Praffi's "never invent numbers" and Chapter 01's real pole lap.

**Picking the pass.** Picking is done once, by hand, with a tool script. A pass qualifies only if all of these hold:

- it is a Grand Prix race lap, lap 2 or later;
- neither car pits on that lap or the lap before;
- both cars are on slicks (the race was wet, dry, then wet again);
- the two cars are not team-mates: Verstappen on Hadjar (lap 38, P2) was a Red Bull team order, so it is out;
- the chaser is no more than 0.9 s behind at the detection point, which leaves a margin inside the 1.0 s rule for measurement error;
- OpenF1's overtake record shows the position change between the line and Turn 2;
- the chaser draws level before it starts braking, so the four steps happen in order;
- the chaser starts braking for Turn 1 at least 15 m later than the leader;
- both cars' laps align to the model.

**Precision.** Car data and location arrive at about 3.7 Hz, which is about 20 m apart at 300 km/h. `alignLap` also fits each car on its own. So every measurement interpolates between samples:
- the time each car reaches a track position;
- the moment the brake comes on.

The page claims only what that precision supports:
- the gap is shown to 0.1 s;
- the brake difference is rounded to 5 m and written "about `<n>` metres after the leader".

As a sanity check, the detection gap must agree with OpenF1's `intervals` at the nearest timestamp to within 0.3 s. A pass that fails the check is rejected. **My call** (raised by the builder check).

Among the passes that qualify, the one for the highest position wins. Recon on 2026-11-11 found these candidates, still to be checked against the rules above:

- Russell on Lawson, lap 8 (P4);
- Hamilton on Lindblad, lap 29 (P9);
- Russell on Hülkenberg, lap 30 (P7);
- Piastri on Hülkenberg, lap 9 (P7);
- Gasly on Leclerc, lap 24 (P13).

If none qualifies, stop and bring it back to Praffi. Do not fall back to invented data.

**The data file.** The pass is baked once into a small static file committed with the chapter, and decoded with an Effect schema at load. It holds:

- for each car: the three-letter code, full name and team, plus rows of `[t, u, speed, gear, throttle, brake]` over the window;
- the race, the year, the lap and the position fought for.

It is not KV and not the hourly job, because a teaching replay is evergreen. The window crosses the start/finish line, so each car's two laps are aligned and joined. The window runs from about 1 s before the chaser reaches the detection point to just after the Turn 1 apex, which should come to about 17 s; the real length is whatever the data says. **My call.**

**The four steps come from the data**, not from fixed copy, so the callouts stay true:

1. **Within one second.** This is the moment the chaser crosses the detection point. The gap is the time between the two cars at that point: "`<gap>` s behind at the detection point. That unlocks Overtake Mode for the straight."
2. **Overtake Mode.** This is the moment the chaser passes the activation point, after the Turn 13 kink. Copy as in the mock.
3. **Out of the tow.** This is the first moment the chaser's nose is level with the leader, within one car length along the track. Copy as in the mock.
4. **Brake later.** This is the moment the chaser starts braking for Turn 1. The copy ends "braking about `<n>` metres after the leader", where n is the gap between the two braking points along the track, rounded to 5 m.

**The readout table** shows the chaser and leader rows at the current moment. Columns:

- **Speed:** km/h from car data.
- **Gap:** for the car behind, the time since the car ahead passed the same point. For the car in front, `Ahead`. The rows swap labels at the pass.
- **Gear.**
- **Mode:** `Straight` inside a straight-mode zone and `Corner` outside one. For the chaser, `Overtake` (purple) from the activation point to Turn 1, because it was within 1.0 s at detection.
- **Throttle:** a five-cell meter, as drawn for the mock's Battery column. It shows the word `Brake` in purple while the brake is on.

The mock's Battery column is dropped, because no public data reports battery charge. A mono footnote says: "Overtake Mode is shown where the rules unlock it. Teams don't publish when a driver presses it." **My call.**

**How it moves.** The motion map's entry ("Pinned. Scroll drives the cars along the road.") meets the mock's timeline:

- The section pins, and scrolling through it moves the replay from 0 s to the end.
- The timeline is a real slider (`role="slider"`, value text such as "13.6 s, step 3 of 4, Out of the tow").
- Dragging the handle, or pressing ← → (previous or next step) and Home/End, moves the same single time value. These inputs never fight the scroll.
- When time passes a step, that step's callout and timeline pin light up.
- With reduced motion, nothing pins and nothing scroll-drives. The replay opens on its last frame with all four callouts shown, and the timeline and keys still work.
- On a phone, the stage uses the weekend band's tall framing, and the callouts move below the stage as a numbered list. The table becomes two stacked rows that fit 390 px, and the pin stays.

**My call** on the pin length and on how scroll and drag share the time value.

**No WebGL.** The stage falls back the way the weekend band does, to its poster still. The table, timeline and callouts keep working over the still, with the dots drawn on the HTML overlay.

### 2. The layout varies from section to section

In the mock, the hero, "One move", the replay and "The air" all use the same block: a small label, the headline on the left, a grey paragraph on the right. That is the "every section is the same template" failure Praffi flagged on 2026-11-07. The copy stays, and the layouts change (agreed with Praffi on 2026-11-11):
- **Hero:** keeps the mock's layout.
- **One move:** photo-led, like Lando's captioned collages. The headline runs at mega size across the full width with no side column. The Malaysia paragraph becomes the lead caption of the big frame, above `01 · The straight`.
- **The replay:** keeps the plain header. It is the one place the label, headline and side-line block stays.
- **The air:** image first. The Haas photo opens the section with its callouts, and the label, headline and paragraph come after it, above the Tow and Dirty air rows.
- **The 2026 rules:** the ghost "DRS" is already its own layout.

### 3. The words work inline

Chapter 01's term mechanism is reused: chips plus inline terms, one list of definitions. This chapter's terms:

- tow
- slipstream
- dirty air
- detection point
- Overtake Mode
- straight mode
- active aero
- braking zone
- inside line
- DRS (taught as history: "until 2025")

`Full glossary →` stays `Soon`. The definitions are written in the mock's voice and checked against the 2026 rules.

### 4. Wiring the guide in

- **Route** `/chapters/overtaking`, with page title "How overtaking works · Lights Out". **My call** on the slug, next to `/chapters/race-weekend`.
- **The chapter nav** in the hero: `← 01 A race weekend` links to Chapter 01, and `03 Tyres and strategy →` shows `Soon`.
- **Chapter 01** now links here from its hero line (`02 How overtaking works →`) and from its next-chapter card. Both show `Soon` today.
- **Home's** "Start here" row 02 and the Menu's How F1 works · 02 link here, because `CHAPTERS[1].to` is set.
- **The weekend page teaser** goes back to Chapter 02, which is what it was drawn for: "Watch the pass at Turn 1", `Read`. Chapter 01 stays reachable from "Start the guide" and Home. **My call.**
- **The next-chapter card** shows Chapter 03 as in the mock, with `Soon` in place of the link.
- **Reading time:** 5 min in the hero label and on Home.
- **Not in scope:**
  - the How F1 works index;
  - chapter 05's title mismatch (Home says "Inside the car", the index mock says "Penalties and track limits");
  - the glossary page;
  - chapters 03 and later.

## Page order (light theme)

Hero (paper) → Baku photo → one move, three frames (paper) → the replay (broadcast dark, the signature) → the air (paper) → the 2026 rules (paper) → words → next chapter → footer.

In the dark theme, everything is tarmac and the replay stays broadcast dark.

## Rules that apply (from DESIGN.md and earlier decisions)

- **Every section is a poster:** one image or one number, a headline, a caption. There is one dense widget, the replay.
- **Photos:** every photo has a caption block with the place and year, plus its Commons credit. Only CC0, CC BY, CC BY-SA or public domain. No OpenF1 headshots, and no F1, FIA or team logos as graphics. The Malaysia 2017 frames (Morio) and the Haas tow at Spa 2026 (Der Alf) must be found on Commons and their licences checked. The Figma fills show which shots they are.
- **Motion** follows `docs/motion-map.md`:
  - the hero headline sweeps, then the label;
  - photos arrive behind the bar and drift;
  - paragraph groups fade up 24 px;
  - the Haas callouts appear one at a time: dot, then leader line, then chip behind its bar;
  - the Tow and Dirty air rows rise and the payoff row fills purple last;
  - the DRS strike bar draws across the ghost letters (my call, in the `brake` ease);
  - the table rows rise;
  - the next-chapter photo wipes up.

  One ease family (`launch`, `brake`).
- **Reduced motion:** nothing stretches or blurs, nothing stays hidden, and nothing pins.
- **Themes and sizes:** both themes, and phone at 390 px with no horizontal overflow. On a phone:
  - the three frames stack;
  - the Haas callouts become numbered dots plus a list;
  - the Tow and Dirty air rows stack;
  - the tools table becomes one card per tool.
- **Text and data stay real HTML.**
- **Code:** no comments, no `as` casts except `as const`, no `any`, no non-null `!`. `bun run lint` passes, and the existing style is kept by hand.

## Facts to verify before ship

From press coverage on 2026-11-11:

- Overtake Mode replaces DRS as the chaser's tool. It gives an extra 0.5 MJ of electrical energy, and it is unlocked by being within one second at a single detection point, usually near the final corner.
- The energy is available on the next lap, not the lap where detection happens. At Interlagos the detection point (exit of Turn 12) sits just before the line, so the "next lap" begins with the run up the hill to Turn 1. That is why the mock's story holds.
- The chaser keeps up to 350 kW all the way to 337 km/h. The leader's deployment starts to taper above 290 km/h. This is the mock's "Extra electric power, for longer".
- At Interlagos 2026 the detection point is at the exit of Turn 12, and activation is after the Turn 13 kink.
- Interlagos has two straight-mode zones.
- Overtake Mode is off on lap 1.
- DRS ran from 2011 to 2025, which is fifteen seasons.
- Malaysia 2017: Verstappen passed Hamilton into Turn 1 on lap 4 with DRS, and won.

Before ship, confirm these against the FIA 2026 Sporting and Technical Regulations and the São Paulo event notes:

- the one-second threshold;
- whether the energy is available on the same lap or the next one (sources differ);
- the exact detection and activation points, and the two straight-mode zones, placed on the model as track positions;
- that "every car opens its wings on the straights" (straight mode) is right for 2026, and what happens in the wet;
- that the chosen pass happened as the data says, using a race report or the broadcast.

**This check runs first, before the step logic is built.** Positions such as the detection point and the activation point are data constants. If a rule differs from the mock's story, the constants and the copy change and the step logic stays as it is. If a step cannot be true under the real rules, for example the energy only arriving a full lap later, stop and bring it back to Praffi. **My call** (raised by the builder check).

## Proof before PR

- **Unit tests (pure functions):**
  - the four step times and their numbers from a pass (detection gap, activation, level, the brake-point gap in metres);
  - the gap readout before and after the pass;
  - the mode column;
  - previous and next step from any time;
  - decoding the baked pass file;
  - the pass-picking rules, on a fixture, rejecting each of these:
    - a team-mate pass;
    - a pit lap;
    - a pass where the cars draw level after braking;
    - a pass whose gap disagrees with `intervals`.
- **Playwright:**
  - the chapter renders in both themes at 1440 and 390, with no horizontal overflow;
  - scrolling through the pinned replay moves the dots, lights the steps in order and reaches step 4;
  - dragging the timeline and pressing ← → / Home / End move the replay and update the slider's value text;
  - reduced motion opens on the last frame, unpinned, with all four callouts visible;
  - the chapter nav and Chapter 01's links reach this page;
  - a term chip opens its definition.
- **A bar check against the references, done in the browser by me, not delegated.** After the page and again after the replay are built:
  - open landonorris.com and mercedesamgf1.com and compare them section by section with the live page;
  - check the 7 rules in DESIGN.md;
  - look for drawn stand-ins;
  - check that no two neighbouring sections share a layout.

  Anything below the bar is fixed before the task closes.
- `bun run lint` and the project's checks pass. Live screenshots of the page for Praffi.
- sol-loop before any PR. No council (Praffi's usual for Lights Out).

## Left to the builder

- The tool script's name and its candidate listing. Where the baked file and the chapter code live.
- How the stage takes a second HUD (two dots, segment, detection mark) without changing the weekend band or Chapter 01's pole band.
- Sharing Chapter 01's hero, photo, words and next-chapter pieces with Chapter 02, where that removes duplication rather than adds abstraction.
- The exact body copy and term definitions, in the mock's voice: short, plain, present tense.
- The pin length, the scroll-to-time mapping, and where the callouts sit on a phone.
