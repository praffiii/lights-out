# Broadcast circuits: design

## Why

Praffi: the circuit "feels 2D". The matte road on a pale contour sheet reads as a diagram, not as a place. F1's own broadcast graphics (the Hanoi track-on-map card, the Zandvoort and 2025 Australian GP intro flyovers, the Silverstone framed 3D print) show the track as a lit, raised ribbon sitting in its real surroundings: streets, water, parkland and big buildings, seen from a low oblique camera on a dark screen. That is the look a newcomer already knows from TV, and it is what makes the circuit feel like somewhere real.

## What Praffi decided (2026-11-09)

- **Style B, glow.** The road is a raised ribbon in sector colours (S1 purple `#A43BFF`, S2 green `#2BD45E`, S3 yellow `#F5C400`) that glows, on a dark OpenStreetMap context map: streets, water, green areas, and the larger buildings near the track standing up as low blocks. Approved mocks: `glow-dark.png`, `page-hero-dark.png` and `page-band-full-whole.png` from the session (not the earlier `hero.png` and `band-full.png` drafts).
- **Flat sector labels** ("S1 / SECTOR 1") lying on the ground beside each sector, glowing in the sector colour, and **"01" turn markers** as a ground ring with a chip (Praffi, 2026-11-10, from the label mock: B for sectors, C for turns).
- **A low oblique camera**, as in the broadcast flyovers.
- **Option 1: circuit sections are always a dark "broadcast screen"**, in light theme too. That covers the Home hero and the Race weekend circuit band. Everything else on those pages keeps the visitor's theme.
- The weekend band stays full-width with no frame (shipped in PR #6).

## Goals

- The Home hero and the weekend band show the glow circuit on its map for all five built circuits (br-1940, us-2023, qa-2004, ae-2009, au-1953).
- Everything that works today keeps working: the lap light and its tag, the sector fill, drag-to-spin with Reset, the Turns and Sectors toggles, the poster before WebGL is ready and when it fails, reduced motion, phone layouts.
- The map is credited: "© OpenStreetMap contributors" (ODbL) next to the existing credit line, wherever the map is visible.

## Non-goals

- Calendar tiles (`tiles.sh`): they stay flat and themed.
- New circuits beyond the five.
- Runtime map data or a map library. The map is baked once per circuit.
- A light variant of the glow look.

## Anti-goals

- A page that gets noticeably heavier or slower on a phone. A hero that takes longer to show something than it does today.
- Glow that tints or washes out the map, or turn tiles that blow out (both happened in the mocks before tuning).
- Raw OSM data in the repo.

## Constraints

- Zero cost: OSM data via public Overpass mirrors, built locally, served as static files.
- No F1/FIA/team marks. OSM is ODbL: credit it.
- Repo rules: no code comments, no `as` casts, no `any`, lint clean, tests focused.
- DESIGN.md currently says circuits have "no lights and no glow". That rule is replaced for circuits.

## How (my calls, marked as such)

- **My call: the map is a baked texture, not geometry.** Blender renders the OSM layers (ground, green, water, footprints, minor and major roads) top-down into one image per circuit, and the terrain mesh carries UVs into it. Runtime draws it unlit with the existing distance haze. The map covers the layout plus 1 km, as the mock did, so it stays as sharp as the mock, and fades into plain ground over its outer edge so no street ends in a hard line before the haze.
- **My call: big buildings are geometry.** Footprints of at least 1800 m² within 420 m of the track are extruded into one `blocks` mesh in the glb, as in the mock. Smaller ones stay in the texture.
- **My call: the ribbon is the mock's ribbon.** A dark 24 m road slab; per sector one mesh holding three glowing strips (a 4.5 m core and two 2 m edge lines at the road edges, as in the mock), plus a wider soft halo under it. Height is exaggerated 1.5×, as in the mock (the contour-era 3×/6× `relief` goes away).
- **My call: glow without post-processing.** The halo is drawn additively with a soft falloff across its width. No bloom pass, so no extra render targets on phones. The poster is rendered in Eevee with emission-only materials that match the runtime shaders and no compositor bloom, so the poster-to-WebGL swap stays invisible, and the first poster of br-1940 beside the approved mock decides early whether the halo is enough. If it is not, a desktop-only bloom pass is raised with Praffi before any runtime code.
- **Praffi's call (2026-11-10): sector names are part of the scene.** Blender bakes each "S1 / SECTOR 1" as flat, outlined, glowing text on the ground outward from its sector (anchored at the sector empty, 150 m out), so it turns with the map, appears in the poster, and fades with the Sectors toggle. Turn numbers stay DOM pins (crisp at phone size), restyled as a chip on a short beam above a ring at the turn empty (62 m out). The DOM sector pins go.
- **My call: one poster set.** Posters are rendered only in the dark broadcast style; the light posters are deleted. Budgets are set from br-1940's measured sizes plus 30%, not the old ceilings.
- **My call: a `[data-theme]` element sets its own text colour.** Today `body` resolves `color` once, so text inside a section forced dark stays dark ink. The header, transparent over the top of Home, turns its logo and buttons dark with the hero until it turns solid; its weekend panel keeps the page theme. The broadcast background is the mock's `#06080E`, in the scene, the poster and the section behind them.

## Left to the builder

Exact palette values (start from the mock's glow palette), halo width and falloff. The camera pitch is 36° for every circuit.
