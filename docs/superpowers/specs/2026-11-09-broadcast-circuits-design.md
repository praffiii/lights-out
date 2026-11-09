# Broadcast circuits: design

## Why

Praffi: the circuit "feels 2D". The matte road on a pale contour sheet reads as a diagram, not as a place. F1's own broadcast graphics (the Hanoi track-on-map card, the Zandvoort and 2025 Australian GP intro flyovers, the Silverstone framed 3D print) show the track as a lit, raised ribbon sitting in its real surroundings: streets, water, parkland and big buildings, seen from a low oblique camera on a dark screen. That is the look a newcomer already knows from TV, and it is what makes the circuit feel like somewhere real.

## What Praffi decided (2026-11-09)

- **Style B, glow.** The road is a raised ribbon in sector colours (S1 purple `#A43BFF`, S2 green `#2BD45E`, S3 yellow `#F5C400`) that glows, on a dark OpenStreetMap context map: streets, water, green areas, and the larger buildings near the track standing up as low blocks. Reference mocks: `glow-dark.png`, `hero.png`, `band-full.png` from the session.
- **Flat sector labels** ("S1 / SECTOR 1") beside each sector, and **"01"-style turn tiles**.
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

- **My call: the map is a baked texture, not geometry.** Blender renders the OSM layers (ground, green, water, footprints, minor and major roads) top-down into one image per circuit, and the terrain mesh carries UVs into it. Runtime draws it unlit with the existing distance haze, and plain ground colour outside the map. The map covers the ground the camera sees before the haze turns opaque, measured once in Blender, so no texels go to hidden ground.
- **My call: big buildings are geometry.** Footprints of at least 1800 m² within 420 m of the track are extruded into one `blocks` mesh in the glb, as in the mock. Smaller ones stay in the texture.
- **My call: the ribbon is the mock's ribbon.** A dark 24 m road slab; per sector one mesh holding three glowing strips (a 4.5 m core and two 2 m edge lines at the road edges, as in the mock), plus a wider soft halo under it. Height is exaggerated 1.5×, as in the mock (the contour-era 3×/6× `relief` goes away).
- **My call: glow without post-processing.** The halo is drawn additively with a soft falloff across its width. No bloom pass, so no extra render targets on phones. The poster is rendered in Eevee with emission-only materials that match the runtime shaders, so the poster-to-WebGL swap stays invisible, and the first poster of br-1940 beside the approved mock decides early whether the halo is enough. If it is not, a desktop-only bloom pass is raised with Praffi before any runtime code.
- **My call: turn tiles and sector labels stay DOM pins**, restyled ("01" tiles, flat "S1 / SECTOR 1" labels), placed from empties Blender bakes beside the road (turns 62 m out, sectors 150 m out, as in the mock), in the hero and the band. They stay crisp and keep the existing pin logic. Unlike the mock, they stay upright instead of lying flat on the ground; that difference goes in the side-by-side for Praffi.
- **My call: one poster set.** Posters are rendered only in the dark broadcast style; the light posters are deleted. Budgets are set from br-1940's measured sizes plus 30%, not the old ceilings.
- **My call: a `[data-theme]` element sets its own text colour.** Today `body` resolves `color` once, so text inside a section forced dark stays dark ink. The header, transparent over the top of Home, goes dark with the hero until it turns solid.

## Left to the builder

Exact palette values (start from the mock's glow palette), halo width and falloff, camera pitch per circuit.
