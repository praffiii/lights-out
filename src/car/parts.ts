import { Schema } from 'effect'

import json from './parts.json'

export const PARTS = [
  { id: 'frontWing', n: '01', name: 'Front wing', fact: '2 flaps', job: 'Two flaps that open on the straights and close for the corners.' },
  { id: 'survivalCell', n: '02', name: 'Survival cell', fact: 'Carbon tub', job: 'The carbon shell the driver sits in. It must pass the FIA crash tests before it can race.' },
  { id: 'halo', n: '03', name: 'Halo', fact: 'Titanium', job: "A titanium hoop over the cockpit that keeps flying wheels and debris off the driver's head." },
  { id: 'sidepods', n: '04', name: 'Sidepods', fact: 'Radiators', job: 'Air goes in at the front to cool the radiators packed inside.' },
  { id: 'floor', n: '05', name: 'Floor', fact: 'Most grip', job: 'Air rushing under the car pulls it onto the track. The floor makes most of the grip.' },
  { id: 'powerUnit', n: '06', name: 'Power unit', fact: '350 kW', job: 'A 1.6-litre V6 turbo plus a 350 kW electric motor. Close to half the power is electric.' },
  { id: 'rearWing', n: '07', name: 'Rear wing', fact: 'Flap opens', job: 'Its flap opens on the straights to cut drag, and closes for the corners.' },
  { id: 'tyres', n: '08', name: 'Tyres', fact: '18 in', job: '18-inch Pirelli tyres, narrower for 2026. Chapter 03 has the compounds.' },
] as const

export type Part = (typeof PARTS)[number]

export type PartId = Part['id']

const Vec = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])

export type Vec = typeof Vec.Type

const Framing = Schema.Struct({ position: Vec, target: Vec })

export type Framing = typeof Framing.Type

export const CarRig = Schema.Struct({
  lens: Schema.Number,
  assembled: Framing,
  side: Schema.Struct({ position: Vec, target: Vec, scale: Schema.Number }),
  parts: Schema.Array(Schema.Struct({ id: Schema.String, anchor: Vec, camera: Framing })),
  nodes: Schema.Array(Schema.Struct({ name: Schema.String, part: Schema.String, offset: Vec })),
  hidden: Schema.Array(Schema.String),
  flaps: Schema.Array(Schema.Struct({ node: Schema.String, axis: Vec, angle: Schema.Number })),
})

export type CarRig = typeof CarRig.Type

export const rig = Schema.decodeUnknownSync(CarRig)(json)
