# Motion map

How every page in Lights Out moves: hover, scroll, enter and exit. It builds on the Motion section of `DESIGN.md`. The Home spike (`spikes/motion-home`) proves the global rules and the Home rows. Rows marked *(spike)* have been built and checked.

## What we learned from landonorris.com (Praffi's recordings, 2026-11-08)

Version 1 of the spike was correct but polite. It used five different, subtle effects (lines rising from a mask, labels typing, wipes, count-ups, fades), each played once. Studying the On Track page and the Home page and menu frame by frame showed why Lando's site feels alive:

1. **One reveal, at every scale.** A solid accent block sits on a line of text and slides off to the right, leaving the text behind. Lines cascade one after another, so a paragraph arrives as a staircase. The same move covers giant headlines, body copy, 10 px labels, link lists, buttons and whole screens (a stepped wall of colour that rises and retreats between sections). The motion itself is the brand.
2. **Hover always changes something you can see.** Menu links roll letter by letter into an accent copy, a photo swaps from grayscale to colour, and table rows fill with the accent while a photo follows the cursor.
3. **Scroll drives scenes; it doesn't just trigger them.** The hero portrait shrinks into a card as giant text passes behind it, a 3D helmet turns as you scroll, a giant "49" travels with photos popping over it, and the page background colour changes between sections.
4. **Numbers roll** like an odometer instead of counting up.
5. **Colour moves in big masses** (the stepped curtain, the background shifts, the footer rising with a shaped edge), and the page is calm between them.

We take the *principles*, not the look: no lime, no staircase curtain and no helmet. Our version uses F1's own objects.

## Our grammar (v2): the sector bar

| Move | What it does | Where |
|---|---|---|
| `sweep` (the sector bar) | A thin purple line runs along the baseline of a line of text, like a sector completing on a timing screen. It thickens into a block, and the block pulls away to the right, leaving the text. Each line follows 80 ms after the one above, so paragraphs arrive as a staircase. | Every heading, label, caption, title and paragraph *(spike)* |
| `reveal` | The same bar crosses a whole photo; the photo lands behind it (settling from 1.18×) and then drifts slower than the page. | Every photo *(spike)* |
| `block` | The bar crosses a small solid thing (a chip, a caption plate) before it appears. | Callout chips, caption plates *(spike)* |
| `roll` (timing tower) | Each digit is a column that spins one full lap and lands, left column first. A year keeps its leading digits (1950 → 1973). | Every stat *(spike)* |
| Hover roll | Letters roll up one after another (14 ms apart) and a purple copy rolls in from below, like a position change on the timing tower. CSS only. | Menu links, Menu button, CTAs, footer links, "All chapters" *(spike)* |
| Launch | Leaving the hero, the headline widens from `wdth` 100 to 125 and its two lines pull apart, so scroll acts as the throttle. | Hero *(spike)* |
| Page change | The same purple line, 3 px tall, sweeps across the top. | Every navigation *(spike)* |

Purple stays rare on a page at rest. It appears in motion: the bar passes and leaves the content behind.

## Stack

No new framework. Two small additions to the stack the spec already names:

| Package | Why | Note |
|---|---|---|
| `gsap` (+ ScrollTrigger, SplitText, CustomEase) | Every tween, scroll trigger and text split | Already in the spec. All plugins are free. |
| `lenis` | Smooth scroll, the same feel as landonorris.com | New. Runs on GSAP's ticker, not its own loop. |
| `@gsap/react` | `useGSAP`: tweens are scoped to a component and reverted on unmount | New, about 1 kB. |
| `@react-three/fiber` | The 3D circuits | Already planned. Uses `frameloop="never"` and is advanced from GSAP's ticker only while it is on screen. |

The page transition uses GSAP plus the router's `navigate`. View Transitions are not needed. Rive stays out.

Bundle in the spike, gzipped:
- main chunk, 161 kB: React, the router, GSAP and Lenis;
- 3D chunk, 257 kB: three.js. It loads lazily, one screen before the first circuit.

## Global rules

- **One clock.** Lenis, ScrollTrigger, every tween and the 3D canvas all tick from `gsap.ticker`. Never use `addEventListener('scroll')` or a `requestAnimationFrame` loop of your own. *(spike)*
- **Eases.**
  - `brake` = `cubic-bezier(0.05, 0.7, 0.1, 1)` is the default: fast arrival, long settle.
  - `launch` = `cubic-bezier(0.8, 0, 0.15, 1)`: hold, then go. Use it for wipes, the menu and page changes.
- **Durations.** UI 240 ms, elements 0.6–0.9 s, scenes 1.2–1.6 s. Stagger 30–60 ms. Big things move slower than small things.
- **Velocity widens type.** Scroll speed drives Archivo `wdth` on display headings: from 100 at rest to 112 flat out. It rises fast and settles slowly, and is applied through one CSS variable on `<main>`. *(spike)*
- **Moves.** All live in `motion.ts` and are listed in "Our grammar (v2)" above. No section invents its own.
- **Theme bands.** A section in the opposite theme flips the whole page's colours while it is on screen. The colour variables are registered with `@property`, so the swap is a 0.6 s tween and every piece of text follows. *(spike)*
- **Reduced motion.** No loader, no Lenis, no 3D (the Blender poster takes its place) and no flips. Every element shows in its final state. You can test it with `?reduced`. *(spike)*
- **Touch.** Nothing depends on hover. Cursor-following previews are off on touch. Every link still works with a tap.

## Decisions (settled by Praffi, 2026-11-08)

1. **Page change:** the purple line. The red curtain is dropped, and red is reserved for the start lights.
2. **`wdth` at rest:** 100, as in the mocks, rising to 112 with scroll speed. The 62 → 100 launch is kept for the footer wordmark.
3. **Header on return:** it takes the page colour as a fill.
4. **One clock extras** (blur, speed readout, gear, engine pitch): dropped with the intro (Praffi, 2026-11-09).

## Shell (every page)

| Element | Enter | Hover / tap | Scroll | Exit |
|---|---|---|---|---|
| Loader *(spike)* | Five dots light red with real progress (fonts and the hero photo), at most one every 140 ms. | None | None | All five go out together after a 0.2–0.5 s hold, the screen lifts (0.7 s, launch) and the page entrance plays. Capped at 2.6 s. |
| Header B *(spike)* | Visible at load. | Menu button: the bars cross into an X in 240 ms. | Steps aside on scroll down after 200 px; returns on scroll up with a fill. | None |
| Weekend box *(spike)* | Ticks every second. | Opens the 440 px panel: clip down 0.4 s; the tab underline slides 240 ms. | None | The panel clips up 0.3 s. |
| Menu *(spike)* | The panel wipes down (0.6 s, launch). The big links arrive as a staircase of sector bars, 70 ms apart, and the photo arrives behind a bar of its own. The chapter list and theme row fade in. Focus moves to the first link. | Links: the hover roll into purple. Hover or focus also swaps the photo with a 0.5 s wipe and updates its caption. The current page is ink with a purple square. | Lenis stops while the menu is open. | It clips back up in 0.5 s. Escape closes it, and focus returns to the Menu button. |
| Page change *(spike)* | The purple line exits to the right while the next page's headline sweeps in behind it. | None | Jumps to the top (no animated scroll). | The line sweeps across the top (0.32 s) and the page fades (0.2 s). The total is under 0.8 s. |
| Footer *(spike)* | The wordmark letters rise and launch from width 62 to 100, 35 ms apart. The disclaimer arrives behind the sector bar. | Links: the hover roll. | None | None |
| Links and buttons | None | Arrows nudge 4 px; the purple underline grows; focus shows a 2 px purple outline. | None | None |

## Home *(spike: every row)*

| Section | Enter | Hover | Scroll |
|---|---|---|---|
| Hero | The headline's two lines sweep in 100 ms apart. The paragraph sweeps line by line, then the meta line. The photo arrives behind the bar and settles from 1.18×. "Start the guide" fades up last. | "Start the guide": the hover roll, and the arrow nudges. | Leaving the hero, the headline launches (`wdth` 100 → 125) and its lines pull apart. The photo drifts (±5 %). |
| Start here | The labels sweep. | The row fills ink from the left in 240 ms and its text inverts. "Read →" slides in. A 300 × 200 photo rides the cursor (centred, 0.45 s chase) and leans into the direction it travels, up to 12°. Moving to another row, that chapter's photo overtakes from the side you moved towards. | The hairlines draw, and the five titles sweep in as a staircase, 80 ms apart. |
| The car (opposite theme) | None | None | The band grows from an inset card to full bleed (scrubbed), and the page flips to the opposite theme. The photo settles from 1.14× to 1× (scrubbed). The six callouts appear one at a time: dot, then leader, then chip behind its bar. The caption plate arrives behind a bar. The weight and wheelbase roll. |
| Interlagos | None | None | The heading, circuit and facts arrive, centre on screen and hold still together for 1.5 screens of scroll while scroll drives one full lap: the sectors fill purple, green, yellow and the camera swings round to the poster's angle. A phone holds only the circuit; the heading scrolls away above it. The 3D (meshopt-compressed, 318 KB) downloads and mounts behind the loader, so the lap is live (~0.45 s) before the page is shown; if it is ever late, the poster shows greyed, never as a finished lap. The turn numbers track the road. The facts roll (First GP from 1950). |
| Interlagos hero lap | None | None | The camera holds the glTF camera's pose, shifted exactly as in the poster, and scrolls with the page; scroll never moves it. The sector fill is tweened on the loader's lift, not by scroll. A light laps the circuit at speed-true relative pace, one lap every 14 s, with an 8-sphere trail; the driver tag follows it, offset 8 px left and 8 px down. |
| Read next | None | The photo zooms 1.04× over 0.9 s. | The photos arrive behind the bar and drift; the titles and credits sweep. |

## This season

Built. The headlines and the round count `sweep`, the photos `reveal`, the points `roll`, and the payoff (the leader's name, the leading team, the current leader's caption) is a `block` that fills purple last. The phone keeps every motion but the strip becomes a vertical list of stints, so its scrub reads as a wipe.

| Section | Enter | Hover / tap | Scroll |
|---|---|---|---|
| Headline and count | The headline rises; "Round 20 of 23" types on. | None | None |
| Calendar grid (23 Blender tiles) | None | The tile lifts to the hover state: the 3D tile swaps to the accent render and a photo card clips in beside it, 240 ms. On touch, a tap toggles the card. | The tiles fade up row by row, 30 ms apart. The "Now" tile's purple edge draws. |
| Title-fight strip | None | A column shows its round's points in a mono chip. | The 23 columns draw left to right, scrubbed. The leader's line fills purple last. |
| Standings rows | None | The row fills ink from the left. | The hairlines draw; the points count up. The payoff row fills purple last. |

## Race weekend

Built. The hero photo `reveal`s behind the sector bar while the label, the Grand Prix name and the dates `sweep` in after it. Below the hero, each section moves once as it scrolls in. The countdown never animates on a tick. Everything is still under reduced motion and nothing stays hidden.

| Section | Enter | Hover / tap | Scroll |
|---|---|---|---|
| Hero | The bar crosses the photo, which settles from 1.18×. The label, the name and the dates `sweep`, 120 ms apart. | None | None |
| Countdown | Each digit group and colon is a `block`, 60 ms apart. `block` because a `sweep` would split the text and freeze the ticking digits. | None | None |
| Circuit band | The bar crosses the whole card (a `block`, so the live 3D view is hidden with it). The length, distance and laps `roll`; the first Grand Prix rolls from 1950. The schedule hairlines draw. | Drag spins the circuit ±45° and springs back; Reset tweens home over 0.8 s. The Turns and Sectors toggles fade their layers. | None |
| Latest | The portrait `reveal`s, the gap `roll`s, and the P1 row is a `block` that fills last. | None | None |
| Teaser | The photo `reveal`s and the title `sweep`s. | None | None |

## The tracks

From here on the pages are planned, not built. Read every "rises", "types on" and "wipes" as the sector bar (`sweep`, `reveal`, `block`), and every "counts up" as `roll`.

| Section | Enter | Hover / tap | Scroll |
|---|---|---|---|
| Index (dark, 23 renders) | The headline rises. | The render swaps to its sector-coloured version and the name types on, 240 ms. A photo preview follows the cursor. | The tiles fade up row by row. |
| Circuit page header | The name rises; the caption types on. | None | None |
| Circuit band (Suzuka convention) | None | Layer chips (corners, sectors, speed trap, Overtake detection) toggle their layer with a 240 ms fade. | The 3D lap scrubs as on Home. The stat column counts up. |
| Overtaking replay map | None | None | Pinned. Scroll drives the cars along the road. The detection line draws in purple when the chaser crosses it. Drag the timeline or ← → to step; the scroll follows. |

## The people

| Section | Enter | Hover / tap | Scroll |
|---|---|---|---|
| Index | The headline rises. | The row fills ink; the driver photo follows the cursor. | The rows rise 40 ms apart. |
| Driver page: number poster | The giant number counts up from 0, and the name rises behind it. | None | The number drifts slower than the page. |
| Big-type ladder | None | None | The rows rise one by one; the payoff row fills purple last. |
| Monza band (opposite theme) | None | Layer chips as on circuit pages. | The page flips; the lap scrubs. |
| Grid close-up (3D, 22 cars) | None | None | The camera pushes down the grid (scrubbed). The driver's slot lights purple when it reaches the centre. |

## How F1 works and the chapters

| Section | Enter | Hover / tap | Scroll |
|---|---|---|---|
| How F1 works index | The headline rises. | The chapter rows behave as on Home. | Same as Home. |
| Chapter hero | The headline sweeps in, then the "Chapter 02 · 5 min" label; the photo arrives behind the bar. | "All chapters ←": the hover roll. | The photo drifts. |
| Body text | None | Glossary terms: the dotted underline turns solid and the definition pops in under the term (0.24 s). On touch, a tap toggles it. | Paragraph groups fade up 24 px. |
| Diagram or render per chapter (switchback, grid, tyres) | None | Chips toggle layers. | Pinned and scrubbed through the moments (dive, apex, cross, exit). A mono caption types the current moment. |
| Timing tower / race log rows | None | The row fills ink. | Rows rise; times count up; the payoff row fills purple last. |
| Next chapter (footer lead) | None | The photo zooms. | The photo wipes up. Clicking runs the page change. |

## The car and engine

| Section | Enter | Hover / tap | Scroll |
|---|---|---|---|
| Hero photo with callouts | The headline rises. | A chip highlights its part: the dot pulses once. | The callouts appear one at a time, as on Home. |
| Part sections | None | None | Each part photo wipes; its spec counts up. |
| 2026 active aero | None | A "Corner / Straight" toggle flips the wing state with a 0.6 s brake tween. | Scrubbed between the two modes. |

## Glossary, 404, credits

| Page | Motion |
|---|---|
| Glossary | Letter index: the active letter fills ink. Terms rise as you reach them. A link to a term on another page lands on it and its row flashes purple for 0.6 s. |
| 404 | "Veered off track." rises. A small 3D runoff render wipes in. "Back to the track →" runs the page change. |
| Credits | Rows rise. Each photo credit shows its thumbnail on hover (it follows the cursor) and nothing on touch. |

## What the spike proved

| Check | Result |
|---|---|
| Loader | 1.9 s on a cold load (cap 2.6 s) |
| Page change | 0.62 s with the purple line |
| Scrolling the whole Home with 3D | 60 fps; the worst frame was 18 ms on this Mac |
| `wdth` at speed | Rises to 112, settles to 100.15 within 1.8 s |
| Reduced motion | No loader, no Lenis, no canvas, no bars; zero hidden text |
| v2 grammar | Every line, photo, chip and number arrives behind the sector bar or rolls; after scrolling the whole page on a phone, no text is left hidden; no console warnings |
| Phone (390 px) | No horizontal overflow; the car callouts become numbered dots plus a list |
| Console | No errors |

Still to prove in the build:
- the calendar hover;
- a pinned replay;
- the same results on a mid-range phone, not just this Mac.
