import type { KVText } from '../../src/season/store.ts'

export const fakeKV = (seed: Record<string, string> = {}) => {
  const entries = new Map(Object.entries(seed))

  const kv: KVText = {
    get: async (key) => entries.get(key) ?? null,
    put: async (key, value) => {
      entries.set(key, value)
    },
  }

  return { kv, entries }
}
