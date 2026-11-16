import handler from '@tanstack/react-start/server-entry'

import { dispatchRefresh } from './season/dispatch.ts'

export default {
  fetch: (request) => handler.fetch(request),
  scheduled: (_controller, env) => dispatchRefresh(env.GITHUB_DISPATCH_TOKEN, fetch),
} satisfies ExportedHandler<Env>
