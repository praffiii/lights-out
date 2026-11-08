# Circuit facts

These are the values behind `src/circuits/registry.ts` and the turn and sector settings in `blender/circuits/circuit.py`, each with its source. Praffi checks them before release.

## How the values were read

- **Facts.** First GP, length, laps and race distance come from each circuit's formula1.com 2026 race page. Race distance is the published figure, not length × laps; the two differ slightly, because the start line and the finish line are in different places.
- **Turns, direction and sectors** come from the official FIA circuit map PDF.
  - Interlagos and Albert Park use the 2026 sheets.
  - Las Vegas, Lusail and Yas Marina use their 2025 sheets, because the FIA had not posted 2026 maps for those events when these were read.
- **Turn positions.** Each turn index in `circuit.py` is the corner of the bacinger/f1-circuits layout that matches the FIA's numbered corner, matched by eye on north-up drawings of both.
- **Sector cuts** are measured along the layout from the FIA's sector-line offsets, such as "S1 80 m before Turn 6".
  - Two sheets also print the sector lengths. Measuring from the turns reproduces them: Interlagos gives 28.2% / 73.0% against the printed 28.7% / 73.8%, and Albert Park gives 32.8% / 60.0% against the printed 33.2% / 60.0%.
  - The 2026 sheets label these lines "Intermediate 1/2"; the sector lengths printed with them add up to the full lap.

## Interlagos · São Paulo GP

| Fact | Value | Source |
|---|---|---|
| First GP | 1973 | https://www.formula1.com/en/racing/2026/brazil |
| Circuit length | 4.309 km | same; the FIA map agrees |
| Laps | 71 | same |
| Race distance | 305.879 km | same |
| Turns · direction | 15, anticlockwise | https://www.fia.com/system/files/decision-document/2026_sao_paulo_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf |
| Sectors | S1 ends 170 m before T4; S2 ends 85 m before T12 | FIA map |
| Named corner | S do Senna, T1 | The F1 page names the Senna S. Placing it at T1–T2 is a reading of the page together with the map |

## Las Vegas · Las Vegas GP

| Fact | Value | Source |
|---|---|---|
| First GP | 2023 | https://www.formula1.com/en/racing/2026/las-vegas |
| Circuit length | 6.201 km | same; the FIA map agrees |
| Laps | 50 | same |
| Race distance | 309.958 km | same |
| Turns · direction | 17, anticlockwise | https://www.fia.com/system/files/decision-document/2025_las_vegas_grand_prix_-_event_notes_-_circuit_map_v2_pit_lane_drawing_emergency_map_exits_quarantine_zone_and_red_zones.pdf |
| Sectors | S1 ends 90 m after T5; S2 ends 140 m after T12 | FIA map |
| Named corner | Sphere chicane, T7 | **Secondary sources only.** https://www.autosport.com/f1/news/a-lap-of-las-vegas/10547133/ and https://www.motorsport.com/f1/news/a-lap-of-las-vegas/10547152/. formula1.com does not name it |

## Lusail · Qatar GP

| Fact | Value | Source |
|---|---|---|
| First GP | 2021 | https://www.formula1.com/en/racing/2026/qatar |
| Circuit length | 5.419 km | same; the FIA map agrees |
| Laps | 57 | same |
| Race distance | 308.611 km | same |
| Turns · direction | 16, clockwise | https://www.fia.com/system/files/decision-document/2025_qatar_grand_prix_-_event_notes_-_circuit_map._pit_lane_drawing_emergency_exits_map_ers_battery_containment_area_red_zones_map.pdf |
| Sectors | S1 ends 80 m before T6; S2 ends 75 m before T12 | FIA map |
| Named corner | none | No primary source names one |

## Yas Marina · Abu Dhabi GP

| Fact | Value | Source |
|---|---|---|
| First GP | 2009 | https://www.formula1.com/en/racing/2026/united-arab-emirates |
| Circuit length | 5.281 km | same; the FIA map agrees |
| Laps | 58 | same |
| Race distance | 306.188 km | same |
| Turns · direction | 16, anticlockwise | https://www.fia.com/system/files/decision-document/2025_abu_dhabi_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_quarantine_zone_and_red_zones.pdf |
| Sectors | S1 ends 205 m before T5; S2 ends 100 m before T9 | FIA map |
| Named corner | none | The F1 page mentions the T9 banking, but gives it no name |

## Albert Park · Australian GP

| Fact | Value | Source |
|---|---|---|
| First GP | 1996 | https://www.formula1.com/en/racing/2026/australia |
| Circuit length | 5.278 km | same; the FIA map agrees |
| Laps | 58 | same |
| Race distance | 306.124 km | same |
| Turns · direction | 14, clockwise | https://www.fia.com/system/files/decision-document/2026_australian_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_quarantine_zone.pdf |
| Sectors | S1 ends 120 m before T6; S2 ends 140 m before T9 | FIA map |
| Named corner | none | No primary source names one |

## Not yet confirmed

- **Interlagos corner names.** Curva do Sol (T3), Descida do Lago (T4–5), Ferradura (T6–7), Pinheirinho (T9), Bico de Pato (T10), Mergulho (T11) and Junção (T12) are traditional names, unconfirmed and not used on the site.
- **Left/right turns.** The FIA maps don't print left or right. Each turn's direction was worked out by following the map in the direction of travel, and was used only to match corners.
