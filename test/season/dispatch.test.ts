import { expect, it } from 'bun:test'

import { DispatchError, dispatchRefresh } from '../../src/season/dispatch.ts'

const TOKEN = 'secret-token-123'

it('starts the season workflow on main with a bearer token', async () => {
  const requests: Array<{ url: string; method: string; authorization: string | null; userAgent: string | null; body: string }> = []

  await dispatchRefresh(TOKEN, async (url, init) => {
    const request = new Request(url, init)
    requests.push({ url: request.url, method: request.method, authorization: request.headers.get('authorization'), userAgent: request.headers.get('user-agent'), body: await request.text() })

    return new Response(null, { status: 204 })
  })

  expect(requests).toEqual([
    { url: 'https://api.github.com/repos/praffiii/lights-out/actions/workflows/season.yml/dispatches', method: 'POST', authorization: `Bearer ${TOKEN}`, userAgent: 'lights-out', body: '{"ref":"main"}' },
  ])
})

it('rejects a refused dispatch with its status and never leaks the token', async () => {
  const error = await dispatchRefresh(TOKEN, async () => new Response(`bad credentials ${TOKEN}`, { status: 401 })).catch((cause: Error) => cause)

  expect(error).toBeInstanceOf(DispatchError)
  expect(error).toMatchObject({ status: 401 })
  expect(String(error)).not.toContain(TOKEN)
})
