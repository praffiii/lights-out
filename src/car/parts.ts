import { Schema } from 'effect'

import type { WordKey } from '#/chapter/words.ts'

import json from './parts.json'

export const PARTS = [
  { id: 'frontWing', n: '01', name: 'Front wing', fact: '2 flaps', job: 'Two flaps that open on the straights and close for the corners.', terms: [] },
  { id: 'survivalCell', n: '02', name: 'Survival cell', fact: 'Carbon tub', job: 'The carbon shell the driver sits in. It must pass the FIA crash tests before it can race.', terms: [{ text: 'carbon shell', k: 'survivalCell' }] },
  { id: 'halo', n: '03', name: 'Halo', fact: 'Titanium', job: "A titanium hoop over the cockpit that keeps flying wheels and debris off the driver's head.", terms: [{ text: 'titanium hoop', k: 'halo' }] },
  { id: 'sidepods', n: '04', name: 'Sidepods', fact: 'Radiators', job: 'Air goes in at the front to cool the radiators packed inside.', terms: [{ text: 'cool the radiators', k: 'sidepod' }] },
  { id: 'floor', n: '05', name: 'Floor', fact: 'Most grip', job: 'Air rushing under the car pulls it onto the track. The floor makes most of the grip.', terms: [{ text: 'pulls it onto the track', k: 'groundEffect' }, { text: 'The floor', k: 'floor' }] },
  { id: 'powerUnit', n: '06', name: 'Power unit', fact: '350 kW', job: 'A 1.6-litre V6 turbo plus a 350 kW electric motor. Close to half the power is electric.', terms: [{ text: '1.6-litre V6 turbo', k: 'powerUnit' }] },
  { id: 'rearWing', n: '07', name: 'Rear wing', fact: 'Flap opens', job: 'Its flap opens on the straights to cut drag, and closes for the corners.', terms: [] },
  { id: 'tyres', n: '08', name: 'Tyres', fact: '18 in', job: '18-inch Pirelli tyres, narrower for 2026. Chapter 03 has the compounds.', terms: [] },
] as const satisfies ReadonlyArray<{ id: string; n: string; name: string; fact: string; job: string; terms: ReadonlyArray<{ text: string; k: WordKey }> }>

export type Part = (typeof PARTS)[number]

export type PartId = Part['id']

const Vec = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])

export type Vec = typeof Vec.Type

const Framing = Schema.Struct({ position: Vec, target: Vec })

export type Framing = typeof Framing.Type

const Pair = Schema.Tuple([Schema.Number, Schema.Number])

const Pins = Schema.Record(Schema.String, Pair)

export const CarRig = Schema.Struct({
  lens: Schema.Number,
  assembled: Framing,
  side: Schema.Struct({ position: Vec, target: Vec, scale: Schema.Number }),
  parts: Schema.Array(Schema.Struct({ id: Schema.String, anchor: Vec, camera: Framing })),
  posters: Schema.Struct({ exploded: Pins, explodedPhone: Pins }),
  top: Schema.Struct({ along: Pair, across: Pair }),
  nodes: Schema.Array(Schema.Struct({ name: Schema.String, part: Schema.String, offset: Vec })),
  hidden: Schema.Array(Schema.String),
  flaps: Schema.Array(Schema.Struct({ node: Schema.String, axis: Vec, angle: Schema.Number })),
  shadow: Schema.Struct({ centre: Vec, size: Pair, drop: Schema.Number }),
})

export type CarRig = typeof CarRig.Type

export const rig = Schema.decodeUnknownSync(CarRig)(json)
