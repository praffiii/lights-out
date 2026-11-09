# DESIGN.md — Lights Out: "The Lap"

Approved by Praffi on 2026-11-07. The quality bar is landonorris.com (Awwwards SOTY 2025) or better. We do not copy it.
Round 1 mocks (three skins on one template: Night Race, Blueprint, Poster) were rejected because they had no concept. They stay in Figma on the page "Round 1 — rejected" for reference only.

Figma: https://www.figma.com/design/IPkJZWQnY0IKdIjf6Nuugl (page "The Lap — design system")

What is approved: the system (concept, color, type, grid, shape, motion rules). What is not: the screen boards 03–08 are throwaway examples that only show the rules applied. Praffi called them slop, so none of them ship. Every real screen and component is designed fresh in Part 2.

## Direction v2: modern minimalist (liked by Praffi on 2026-11-07)

On 2026-11-07, Praffi rejected the 3D intro spike: the R3F night straight with a track background. Their words were "too much 3D", "slop", and "no F1 thing". They rated it 3/10.

The v2 Figma mocks replace that direction. They are on the page "v2 — minimalist mocks", in light and dark versions.

What the mocks use:
- A paper (light) or tarmac (dark) background, with a lot of empty space.
- One confident Archivo ExtraBold headline per section, and Martian Mono for labels and data.
- Real F1 photography from Wikimedia Commons, credited on the page.
- A generic car and real circuits, both as matte Blender-built 3D (see below).
- Timing-screen data as the visual: a timing tower, sector colours, and a next-race countdown.

What is gone: no atmospheric 3D environments (the rejected night straight), no glow effects, and no track used as a background.

### 3D first, built in Blender (Praffi's rule, 2026-11-07)

**Everything that can be 3D is 3D, and it is made in Blender.** This replaces the earlier "3D for objects only" rule and the hand-drawn SVG circuits.

- **Pipeline.** Each model is a `bpy` script in the repo, so it can be rebuilt from data, and a `.blend` file Praffi can refine by hand. It exports a `.glb`, and three.js (React Three Fiber) renders it.
- **Look.** Matte and unlit. Top faces are the exact token colour and walls are the same colour at 62%. No glow and no lighting effects. Praffi picked this flat sector look over landonorris.com's glowing track.
- **Poster frame.** Blender renders a still of every scene from the same camera, in both themes. The still shows first, it is the fallback for reduced motion, no WebGL, low-power phones and crawlers, and it matches the 3D end frame pixel for pixel.
- **Circuits.** Built from the bacinger/f1-circuits layout (MIT) plus SRTM 30 m elevation (NASA, public domain), smoothed and exaggerated 3x. Each circuit is a road split into S1, S2 and S3, sitting on ground draped from the road's own heights: a smooth sheet, graded flat under the road (the road is a 1.2 m lip, never floating), running out to a flat plain 5 km away so a low camera sees a horizon, not the edge of a tile. Off-track terrain data (SRTM grid) was tried and dropped: its noise made smudges and grooves, and the clean surface reads better. Slopes get a soft matte hillshade (the same formula in Blender and GLSL), no lights and no glow. Turn numbers and sector labels are DOM pins placed from empties in the model. Proven in `spikes/circuit-3d`.
- **Calendar tiles.** Every calendar circuit is also a small Blender tile (`blender/circuits/tiles.sh`): the road on a narrow embankment, seen from the south at 32° through a 50 mm lens so north stays up and every shape is the one fans know. Four states (done, upcoming, now, hover) in both themes, 208 × 192 WEBP with a transparent film. The tiles are flat, because elevation does not read at this size, and the road widths are exaggerated so they read.
- **Built once, then data (Praffi, 2026-11-08).** Nothing is modelled or rendered per race or per season. Three layers:
  - *Per circuit, built once:* the lap model with its sector cuts, turn pins and start line, about 24 in all. It is rebuilt only when a layout changes, so the season-start check is the only recurring 3D work.
  - *Built once, ever:* shared scenes such as the start grid. That is a plain straight (not cut from any real track), 22 instances of one car model and a fixed camera.
  - *Per race, data only:* what the scenes show (the grid order, the highlighted slot, the labels) comes from the Jolpica fetch. On the site it is a prop, such as `<StartGrid highlight={19} />`. Without WebGL, the fallback is one generic still plus the facts as HTML text.
  - Editorial stories (a driver's Monza win) are written once, like articles, and reuse the same assets.
- **The car.** A `bpy` model with every part as its own mesh: front wing, nose, halo, sidepods, engine cover, floor, rear wing and four wheels. You rotate it and take it apart by scrolling or dragging. Fallback: MaG80's CC-BY car, credited.
- **Racecraft replays are a live-timing map, not 3D (Praffi, 2026-11-07, late).** The photoreal Blender replay was tried and dropped: next to real Commons photos it read "too cartoon" (flat paint, no decals, soft CG trackside). Real photography carries the drama of a pass; the replay explains it the way F1's own live timing does. Two dots move along the real layout, driven by scroll, beside the telemetry.
  - How it is built (spike: `spikes/circuit-3d/blender/replay.py`). `bun run replay` runs the shared simulation (`story.py`) and writes `src/replay.json` in seconds: the lap and the replay stretch as SVG paths, the detection line, turn labels and, per frame, each car's numbers and map position. No rendering.
  - The map frames the stretch from Turn 12 to Turn 1. Lanes are drawn 4x wider than real so side by side reads at map scale; everything else is to scale.
  - It themes with the page like any other diagram, so the signature section's opposite theme applies.
- **What stays 2D (my call, to confirm):** text, numbers, tables, the timing tower and the UI chrome. They are data, and they stay real HTML for accessibility and search.
- **Loading.** Three.js loads only when a 3D section comes near the viewport. Motion stays restrained, as described on the "Motion notes" board.

Both themes ship, as Praffi decided on 2026-11-07. The site follows the visitor's system setting and has a toggle. Every screen is designed in both themes.

**The header is one row (Header B, approved by Praffi on 2026-11-08).** It has no bands, fill or hairline at the top of a page. While you scroll down it steps aside; when it returns on scroll up it takes the page colour as a fill so it stays legible over photos (Praffi, 2026-11-08). The logo dots and wordmark sit on the left, the weekend box in the centre, and "Menu" on the right. There are no centre links, because the Menu overlay lists the pages.

The weekend box is a broadcast-style timing graphic, 32px tall: an ink box with a 4px purple edge, and Martian Mono at 11px in capitals. It turns paper in the dark theme. The box shows one state at a time and picks it itself:
- Before a session: "São Paulo GP | Practice 3 in 02:14:07".
- Live: "● Live | São Paulo GP | Practice 3 41:12 left".
- After a session: "São Paulo GP | Practice 2 P1 Norris".
- Between weekends: "Next Las Vegas GP | in 12 days".

Clicking the box opens a 440px panel underneath, in the box's colours, with Now / Next / Latest / Standings tabs:
- **Now:** the GP and circuit, with the track time and your time, the lap length and the race laps.
- **Next:** the session, then a days / hr / min / sec countdown.
- **Latest:** the top three, with P1 as the purple payoff row.
- **Standings:** the top three drivers by points.

Each tab ends with a link to the full page. On a phone, the box sits on its own row under the logo and Menu, full width.

The idea comes from mercedesamgf1.com, recast in F1 TV's own graphic language.

### References (study the structure, never copy the look)

- **landonorris.com.** One giant headline per section, and real data widgets such as a next-race card with a circuit outline. Real photography carries the colour, and small caps captions label the photos. Do not take its serif/sans mix, its lime, or its contour lines.
- **mercedesamgf1.com.** Added by Praffi on 2026-11-07. Ideas worth borrowing:
  - A live race-weekend strip under the nav with Now / Next / Latest / Standings tabs, the circuit name, and the track's local time.
  - Caption blocks attached to the bottom edge of photos.
  - Viewfinder corner brackets framing driver cards.
  - One accent colour used confidently for every action.

  Do not take its teal, its chamfered card shapes, or its news-feed density.

#### Deep dive, 2026-11-07 (Playwright, every page and state seen first-hand)

Captures: `.playwright-mcp/study/` in the scratch workspace (`lando-*`, `merc/`, `merc-ui/`).

**landonorris.com: what makes it 10/10**
- One idea per screen, set huge: manifesto lines across the full width, and stat numbers at about 230px.
- Photos are scattered collages, each with a tiny uppercase caption giving the place and year. The caption makes the photo read as a document, not decoration.
- The background colour changes between sections, so every scroll lands on a new "poster".
- The current-race card is the only dense widget, and it is earned: a circuit with numbered turn pins, plus stats and a schedule.
- The results table is condensed. Hovering a row shows that track's thumbnail.
- The menu is a list of duotone photos; hovering a link brings its photo to full colour. The current page is marked in the menu itself.
- The footer leads straight into the next page. The 404 stays in the sport's language ("veered off track"). On touch, tapping a card locks it.
- There is one ease everywhere: `cubic-bezier(0.19, 1, 0.22, 1)`, a long settle.

**mercedesamgf1.com: what is worth taking**
- **The live strip has four states.** This is the Mercedes original; ours became the weekend box (see the header section above). Each is a pill tab, 30px tall with 14px text:
  - Now: the GP, the circuit and the local time, with the pill lit green for live.
  - Next: the session, then a countdown spread across the width (days, hr, mins, secs).
  - Latest: the session result as two short lines, for example "Kimi P1 · George P4".
  - Standings: two short lines, one per driver.

  On a phone the strip stacks onto two rows: the tabs first, then the GP, circuit and time.
- **The race page circuit.** A flat black stroke with numbered turn pins and a speed-trap tag. The sector labels are faint and sit beside the line, not on it. Switches show and hide the corners and speed-trap layers.
  - Beside the circuit is a sticky stats card with the numbers stacked large: first GP, length, distance, laps.
  - A sticky page sub-nav ("Schedule / The Circuit / View all races") appears on scroll.
- **The mega menu.** A full-screen overlay, with links staggering in on the left and one large photo on the right. Hovering a link swaps the photo. Its weakness is a link with no photo, which leaves a black void. We give every link an image.
- **Photos with caption blocks.** The type block is attached to the photo's bottom edge. The same treatment is used for stories, team stories and the driver grid.
- **Page hero pattern.** A two-word title in a solid block sits beside a full-bleed photo, followed by an in-page tab row (for example "Our Home / Our Ethos / The Board").
- **The driver page.** A milestones timeline, a favourite-track outline with highlighted sections, and a large quote over a photo.
- **The phone layout.** Every section becomes a carousel that shows the edge of the next card. Buttons go full width.
- **Interaction timing.** 0.25s colour transitions with `cubic-bezier(0.4, 0, 0.2, 1)`. Our `brake` ease replaces it.
- **Where it goes wrong (we avoid all of these):**
  - Long text pages, such as the team, sustainability and academy pages, are plain article columns.
  - Partner logo walls sit on every page.
  - The same "Stories" grid repeats at the end of every page.

**Rules we take from both**
1. Every section is a poster: one image or one number, a headline, and a caption.
2. A dense data widget appears at most once per page, and only where it teaches something: a circuit, a timing strip, a replay.
3. Every photo has a caption block with a place and year, plus the Commons credit.
4. A circuit is always the Blender-built 3D road on its terrain, in sector colours, with numbered turns. Layers (corners, sectors, speed trap, Overtake detection) switch on and off.
5. The strip, the menu and the footer carry real information: a live state, a photo for each link, and the next chapter.
6. One ease family. No repeated feed blocks. No text-only pages.
7. Each chapter's signature section (for example the overtaking replay) uses the opposite theme: tarmac on the light page, paper on the dark page. It is the page's one background shift.

## Concept card

```
Idea:        Your first lap of F1. Scroll is the throttle, and every sector teaches one thing.
Metaphor:    The pit wall's telemetry screen: speed, gear, sector times, track map.
Signature:   The start lights: the loader fills them with real progress and they live on as the logo's five dots.
Emotion:     The held breath before the start, then speed.
Motion verb: Brake and launch. Hold, then accelerate hard. Arrive fast, then settle long.
Screenshot:  The next race's circuit lapping under the timing strip.
```

### Intro (dropped by Praffi, 2026-11-09)

A 25 s first-visit intro was storyboarded on 2026-11-08 and built, then dropped before it shipped: it only stood between a visitor and the site, and the animation did not earn its time. The loader stays. Do not bring back a pre-site intro.

Two runner-up concepts lend parts to this one:
- "Lights Out" (race-start tension) gives the loader.
- "Race Weekend" (Friday to Sunday) may shape the season page.

## Color: every color is a real F1 signal

| Token | Name | Hex | Use |
|---|---|---|---|
| `ground` | Tarmac | `#0E0F11` | Background, with a subtle asphalt grain |
| `ink` | Line paint | `#F2F1EC` | All text |
| `muted` | Kerb grey | `#8A8D93` | Secondary text. Must pass AA on tarmac |
| `line` | Pit wall | `#24262B` | Hairlines and dividers |
| `accent` | Sector purple | `#A43BFF` | "Fastest". The one thing to look at right now. Use it rarely |
| `signal-green` | Personal best | `#2BD45E` | Only with its F1 meaning |
| `signal-yellow` | Caution | `#F5C400` | Only with its F1 meaning (slower, yellow flag) |
| `curtain` | Start-light red | `#FF1E1E` | Only for the start lights (loader, logo dots) |

Genericness check: "near-black with one red accent" is an AI default. Red here is limited to the start lights. The everyday accent is sector purple, and each color carries its F1 meaning.

## Type: the letters accelerate

- **Display and text: Archivo** (Google, OFL), a variable font with width 62 to 125 and weight 100 to 900.
  - Display: weight 800 to 900, tracking about −0.03em, leading 0.85 to 0.95.
  - Scroll velocity drives `wdth` on display type: 100 at rest (as in every mock), up to 112 flat out, settling back with the brake ease (Praffi, 2026-11-08). The 62 → 100 launch is kept for one moment only: the footer wordmark.
- **Numbers: Martian Mono** (Google, OFL). Tabular figures for lap times, speed, gaps and standings.
- **Scale:** mega `clamp(4rem, 1.2rem + 14vw, 16rem)`, xl `clamp(2.5rem, 1.4rem + 4.8vw, 6rem)`, l `clamp(1.75rem, 1.3rem + 1.9vw, 3rem)`, m `clamp(1.25rem, 1.1rem + 0.6vw, 1.625rem)`, body `clamp(1rem, 0.95rem + 0.2vw, 1.125rem)`, s 0.875rem, xs 0.75rem.

## Layout

- **Grid:** 12 columns with a 24px gutter and 56px margins on desktop. 4 columns with 16px margins at 390px.
- **Four corners, each carrying real data:**
  - top-left: the wordmark;
  - top-right: the menu;
  - bottom-left: a mini track map, the lap-progress indicator, and the current sector;
  - bottom-right: speed and gear readouts, and the sound toggle.
- **Section rhythm:** each sector is a pinned chapter. Layout families vary per chapter.

## Shape

Everything is square-cornered. Only things that roll or light up are round: wheels, tyres, start lights and car dots.

## Motion

- **Eases:**
  - `launch` = `cubic-bezier(0.8, 0, 0.15, 1)`: hold, then a violent start.
  - `brake` = `cubic-bezier(0.05, 0.7, 0.1, 1)`: fast arrival, long settle.
- **Durations:** UI 240ms, elements 600–900ms, scenes 1.2–1.6s. Stagger 30–60ms.
- **One clock.** Everything ticks from GSAP's ticker (Lenis, ScrollTrigger, the 3D canvas). On every page, scroll velocity drives Archivo `wdth`.
- **Page transition:** a thin purple sector line sweeps across the top while the next headline arrives behind it (Praffi chose this over a red curtain, 2026-11-08). It must finish in under 0.8s. Full per-page motion: `docs/motion-map.md`.
- **Reduced motion:** no stretching and no blur. All content stays visible.
- **Row hover:** a standings row fills ink from the left in 240ms; its hairline is a background layer so it can draw on scroll. Only on fine pointers.

## 3D, 2D and sound

- **3D (Blender models, rendered with React Three Fiber):** everything that can be 3D, following "3D first, built in Blender" above. That includes circuits, the car, racecraft replays (cars moving on the circuit ribbon) and diagrams such as the slipstream.
- **2D (DOM + GSAP):** text, data, tables and the UI chrome.
- **Sound:** off by default and toggled in the bottom-right corner. A synthesized Web Audio engine note follows the velocity value, with gear shifts at thresholds.

## Concept carried through

- **Loader:** five start lights fill with real load progress, then lights out. 2.6s maximum.
- **The people:** a timing-tower index list with hover previews.
- **Glossary:** team-radio messages ("Box, box").
- **Racecraft:** top-down telemetry replays the visitor scrubs.
- **404:** "DNF. This page did not finish."
