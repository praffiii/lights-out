import { Data } from 'effect'

import type { KVText } from './store.ts'

export class KVWriteError extends Data.TaggedError('KVWriteError')<{
  readonly status: number
}> {
  override get message() {
    return `KV write failed with status ${this.status}`
  }
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>

type KVRestConfig = {
  readonly accountId: string
  readonly namespaceId: string
  readonly token: string
  readonly fetch: Fetch
}

export const kvRest = ({ accountId, namespaceId, token, fetch }: KVRestConfig): KVText => {
  const valueUrl = (key: string) => `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`

  const headers = { authorization: `Bearer ${token}` }

  return {
    get: async (key) => {
      const response = await fetch(valueUrl(key), { headers })

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        throw new Error(`KV read failed with status ${response.status}`)
      }

      return response.text()
    },
    put: async (key, value) => {
      const response = await fetch(valueUrl(key), { method: 'PUT', headers, body: value })

      if (!response.ok) {
        throw new KVWriteError({ status: response.status })
      }
    },
  }
}
