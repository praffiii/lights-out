import { Schema } from 'effect'

import baked from './monza-run.json'
import { MonzaRun } from './monza-run.ts'

export const RUN = Schema.decodeUnknownSync(MonzaRun)(baked)
