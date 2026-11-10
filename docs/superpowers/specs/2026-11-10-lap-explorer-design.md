# Lap explorer: design

## Why

The weekend page's circuit band ends in a dead link, "Explore the lap in 3D · Soon". Praffi wants it to become real, but not as more drag-to-spin: swiping a model around "looks awful". It should feel futuristic and modern, like F1's own broadcast flyovers, and it should be effortless: no play button, no fiddly controls.

A throwaway spike (`spikes/lap-explorer/`, untracked) proved the shape on Las Vegas, and Praffi approved it on 2026-11-10 after three rounds of feel changes. This document describes what the spike taught us, for the real build.

## What it is

A full-screen, dark, broadcast-style view of the next weekend's circuit. It reuses the same model, map, glow shaders, flat sector names and sharp streets as the hero and the band. A camera rides the lap behind a glowing light, low and slightly to the side, looking ahead along the track.

The track lights up behind the light, in each sector's colour, and stays dim ahead of it. The flat S1/S2/S3 names fade in as their sector fills, exactly as in the band.

## How it behaves (decided with Praffi)

- **No play button.** About a second after it opens, the camera swoops down from the familiar overhead framing into the chase view and cruises the lap by itself. It slows for corners and speeds up on straights, following the existing lap timing (`lapProfile`). One lap takes about 48 s. A pill at the bottom left reads `● AUTO` with a pulsing dot.
- **Scroll is position, not push.** A trackpad, mouse wheel, finger swipe or drag on the 3D view moves the light along the lap.
  - One lap is about 14,000 px of scroll, so a normal flick covers roughly one sector.
  - Scrolling backwards reverses. Horizontal or vertical, whichever is larger, counts.
  - The light glides to where the scroll says, with a smooth catch-up of about 0.5 s. When your fingers stop, it stops, with no added momentum and no drift.
  - Praffi rejected the earlier momentum model as "so bad".
- **Turns pull you in.** When you stop within about 1.2% of a lap of a turn, the light settles onto that turn.
- **Once you touch it, it's yours.** Any scroll, swipe, timeline drag, tick tap or arrow key switches the pill to `YOU`. It never resumes by itself; Praffi rejected auto-resume after two seconds. Tapping the pill (it reads `RESUME` on hover) hands back to `AUTO`.
- **Timeline.** A thin bar across the bottom is split into the three sectors in their colours, sized by the circuit's sector cuts. Each sector fills as the light passes it. A tick and two-digit number marks each turn, and close numbers stagger onto a second row so they never overlap. A white playhead marks the light.
  - Dragging the bar scrubs.
  - Tapping a number glides to that turn.
  - ← and → glide to the previous or next turn.
- **HUD.**
  - **Top left:** a small "Lap explorer" kicker in the sector colour, the circuit name in large expanded Archivo, and the circuit's full name, length and turn count.
  - **Top right:** three glassy panels for sector, distance ("1.94 / 6.20 km") and estimated speed with a thin gauge. Their top border takes the current sector's colour.
  - **Speed:** labelled "Est. speed". It comes from the corner-curvature model, not telemetry. It reads 0 when the light is still and follows your hand when you scroll, never above the model's speed for that spot.
- **Corner callout.** Near a turn, a big outlined number (`T07`) rises in at the bottom left, above the timeline, with the corner's name under it in the sector colour. Where the registry has no name, it says "Turn 7".
- **Sector flash.** Crossing into a new sector flashes a large outlined S2 (or S1/S3) at the right edge, glowing in that sector's colour, then fades.
- **Turn chips.** These are the same ring-and-chip markers as the hero and band. Only chips up to about 14% of a lap ahead are shown, and the next turn's chip is filled with the sector colour.
- **Hint copy.** Desktop reads "Scroll to drive · Tap a number to jump". Touch devices read "Swipe to drive · Tap a number to jump". The earlier "Tap a turn" read as "Tap A to turn" in capitals.

## Where it lives (decided with Praffi)

- **Takes over the screen.** On the explorer, only the 3D view and its HUD show, plus a close (×) at the top right. The site's header, Menu button, weekend box, footer and page-wide smooth scrolling are off on this page only. The wheel and touch therefore drive the light, never the page. Every other page keeps its frame unchanged.
- **One link per circuit.** Each circuit with a model has its own address, `/lap/<circuit>`, using the registry ids: `/lap/interlagos`, `/lap/vegas`, `/lap/losail`, `/lap/yas_marina` and `/lap/albert_park`.
  - A shared link always shows the same track, and all five are reachable any time, not only on their race weekend.
  - All five are prerendered.
  - An unknown id shows a plain "No 3D lap for this circuit yet" with a link to the weekend page, never a blank screen.
- **Entry.** The band's `Soon` link becomes a real link, "Explore the lap in 3D", to `/lap/<that circuit>`. The band shows no link when the weekend's circuit has no model, as today.
- **Exit** *(Claude's call)*: the close (×) and Escape go back in history when the visitor came from inside the site, and otherwise to `/weekend`.
- **Loading** *(Claude's call)*: on a fresh visit the site's usual five-lights loader still covers the first load. The one-second delay before the cruise counts from when the loader lifts and the circuit is ready. Until the model is ready, the circuit's poster shows in place of the 3D view.
- **Build order** *(Claude's call)*: a new branch, `feat/lap-explorer`, cut from `feat/broadcast-circuits`, because it reuses that work: the glow, the flat sector names, the sharp streets, the chips and the sector cuts. Its PR opens only after the broadcast circuits ship.

## Circuits, devices and motion *(Claude's calls)*

- **Circuits.** All five shipped circuits work from their existing `.glb`, map and registry data. No new assets and no Blender changes.
- **Phones** use the same view with swipe to drive. The HUD slims to the sector and speed panels, the timeline takes its own full-width row, and the callout and flash shrink. They load the small `-map-2048.webp` like the hero.
- **Reduced motion.** No auto cruise and no swoop. It opens still on the overhead framing with the pill on `YOU`; scrolling moves the light directly, without the catch-up glide. Tick taps and arrows jump instead of glide, and the sector flash and callout appear without animation.
- **No WebGL or a failed load.** It shows the circuit's poster with a short note and the link back, never a blank screen.

## Constraints

- Everything in the project's global constraints applies: no code comments, no `as` casts except `as const`, no `any`, `bun run lint` clean.
- Reuse `broadcast()` from `src/circuits/shaders.ts`, `lapProfile` from `src/circuits/lap.ts`, `screen()` and the registry. The explorer must not change how the hero or band render.
- No new runtime dependencies. GSAP is already available if the builder wants it for the intro swoop and the callouts.
- Fonts are the site's existing Archivo (expanded) and Martian Mono.
- Transfer: the explorer adds no new circuit assets. It loads the same files the band already cached.

## Non-goals

- Real telemetry, real car positions, onboard footage or replays.
- Written notes per corner (option 3 from the brainstorm). They could later hang off the same timeline.
- Sound.
- Free orbit, zoom or drag-to-spin inside the explorer.

## Anti-goals

- A play button, or anything the visitor must press before something happens.
- Control that floats, drifts or overshoots after the visitor stops.
- Auto-resume that takes control back on its own.
- A blank or broken screen on any device.

## Left to the builder

- How the explorer is split into components, and whether it is a new component next to `Circuit.tsx` or an extended layout of it.
- Exact camera constants. The spike used: 250 m back, 125 m up, 30 m to the side, looking 3% of a lap ahead, 44° FOV, a 2.2 s intro and settle rate 6. Tune them per circuit if one feels wrong.
- Exact HUD spacing and type sizes, within the spike's look (see `spikes/lap-explorer/style.css`).
- Test shape, following the project's e2e and unit conventions. The e2e clock lands on Interlagos, so per-circuit coverage should use the `/lap/<circuit>` addresses directly.
