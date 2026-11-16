import { CAR_WORDS, FLAGS_WORDS, OVERTAKING_WORDS, RACE_WEEKEND_WORDS, TYRES_WORDS, type WordKey, WORDS } from '#/chapter/words.ts'
import { type ChapterEntry, CHAPTERS } from '#/home/content.ts'

export type Entry = { key: WordKey; term: string; def: string; letter: string; chapter: ChapterEntry }

const LISTS = [RACE_WEEKEND_WORDS, OVERTAKING_WORDS, TYRES_WORDS, FLAGS_WORDS, CAR_WORDS]

const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const seen = new Set<WordKey>()

export const ENTRIES: ReadonlyArray<Entry> = CHAPTERS.flatMap((chapter, i) =>
  (LISTS[i] ?? []).flatMap((key) => {
    if (seen.has(key)) return []

    seen.add(key)

    const { term, def } = WORDS[key]

    return [{ key, term, def, letter: plain(term).charAt(0).toUpperCase(), chapter }]
  }),
).sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }))

export const LETTERS: ReadonlyArray<string> = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']

export const find = (query: string): ReadonlyArray<Entry> => {
  const q = plain(query.trim())

  return q === '' ? ENTRIES : ENTRIES.filter((e) => plain(e.term).includes(q) || plain(e.def).includes(q))
}
