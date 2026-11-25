import { Schema } from 'effect'

import baked from './miami.json'
import { GhostFile } from './schema.ts'

export const GHOST = Schema.decodeUnknownSync(GhostFile)(baked)
