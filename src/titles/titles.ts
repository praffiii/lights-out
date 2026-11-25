import { Schema } from 'effect'

import baked from './2026.json'
import { Titles } from './schema.ts'

export const FALLBACK = Schema.decodeUnknownSync(Titles)(baked)

export const pickTitles = (live: Titles | undefined, fallback: Titles) =>
  live && (live.season > fallback.season || (live.season === fallback.season && live.rounds.length >= fallback.rounds.length)) ? live : fallback
