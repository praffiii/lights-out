import { Schema } from 'effect'

import json from './pins.json'

const View = Schema.Record(Schema.String, Schema.Tuple([Schema.Number, Schema.Number]))

const Pins = Schema.Struct({ switch: View, switchPhone: View, dive: View, divePhone: View })

export const pins = Schema.decodeUnknownSync(Pins)(json)
