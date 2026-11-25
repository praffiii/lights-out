import { CHAPTERS } from './content.ts'

const COUNT_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'] as const

export const countWord = (n: number): string => COUNT_WORDS[n] ?? String(n)

export const MINUTES = CHAPTERS.reduce((sum, c) => sum + c.min, 0)

export const CHAPTER_SUMMARY = `${countWord(CHAPTERS.length)} chapters · ${MINUTES} min`
