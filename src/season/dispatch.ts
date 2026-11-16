import { Data } from 'effect'

export class DispatchError extends Data.TaggedError('DispatchError')<{
  readonly status: number
}> {
  override get message() {
    return `Season refresh dispatch failed with status ${this.status}`
  }
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>

const WORKFLOW = 'https://api.github.com/repos/praffiii/lights-out/actions/workflows/season.yml/dispatches'

export const dispatchRefresh = async (token: string, fetch: Fetch) => {
  const response = await fetch(WORKFLOW, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'lights-out',
      'x-github-api-version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main' }),
  })

  if (!response.ok) {
    throw new DispatchError({ status: response.status })
  }
}
