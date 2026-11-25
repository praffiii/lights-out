import { Schema } from 'effect'

import { RaceFile } from './schema.ts'
import baked from './vegas.json'

export const VEGAS = Schema.decodeUnknownSync(RaceFile)(baked)
