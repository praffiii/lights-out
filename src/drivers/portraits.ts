import type { Photo } from '#/home/content.ts'

const SOURCES = [
  ['PIA', 'Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['NOR', 'Zandvoort, 2024', 'Photo Steffen Prößdorf · CC BY-SA 4.0'],
  ['RUS', 'Silverstone, 2024', 'Photo Raph_PH · CC BY 2.0'],
  ['ANT', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0'],
  ['VER', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0'],
  ['HAD', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0'],
  ['LEC', 'Cannes, 2026', 'Photo Gabriel Hutchinson · CC BY-SA 4.0'],
  ['HAM', 'Suzuka, 2025', 'Photo Liauzh · CC BY-SA 4.0'],
  ['ALB', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0'],
  ['SAI', 'Venice, 2026', 'Photo LucaFazPhoto · CC BY-SA 4.0'],
  ['LAW', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0'],
  ['LIN', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0'],
  ['ALO', 'Shanghai, 2026', 'Photo Liauzh · CC BY-SA 4.0'],
  ['STR', 'Spielberg, 2022', 'Photo Lukas Raich · CC BY-SA 4.0'],
  ['OCO', 'Suzuka, 2024', 'Photo Rrtb505050 · CC0'],
  ['BEA', 'Suzuka, 2025', 'Photo Liauzh · CC BY-SA 4.0'],
  ['HUL', 'Shanghai, 2026', 'Photo Liauzh · CC BY 4.0'],
  ['BOR', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0'],
  ['COL', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0'],
  ['BOT', 'Adelaide, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0'],
] as const

export const PORTRAITS: Partial<Record<string, Photo>> = Object.fromEntries(
  SOURCES.map(([code, place, credit]) => [code, { src: `/img/drivers/${code}.webp`, place, credit }]),
)

export const portraitFor = (code: string | null): Photo | undefined => (code ? PORTRAITS[code] : undefined)
