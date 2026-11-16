import type { Photo } from '#/home/content.ts'

const SOURCES = [
  ['PIA', 'Shanghai, 2026', 'Photo Liauzh · CC BY 4.0', 'https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Oscar_Piastri_(cropped).jpg'],
  ['NOR', 'Zandvoort, 2024', 'Photo Steffen Prößdorf · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:2024-08-25_Motorsport,_Formel_1,_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3968_by_Stepro_(cropped2).jpg'],
  ['RUS', 'Silverstone, 2024', 'Photo Raph_PH · CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:KingsLeonSilverstne040724_(28_of_112)_(53838006028)_(cropped).jpg'],
  ['ANT', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Kimi_Antonelli_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_(028A7923)_cropped.jpg'],
  ['VER', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Max_Verstappen_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk,_Melbourne_(028A7659)_-_cropped.jpg'],
  ['HAD', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Isack_Hadjar_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_(028A8753)_cropped.jpg'],
  ['LEC', 'Cannes, 2026', 'Photo Gabriel Hutchinson · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Charles_Leclerc_at_the_2026_Cannes_Film_Festival_(cropped).jpg'],
  ['HAM', 'Suzuka, 2025', 'Photo Liauzh · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:2025_Japan_GP_-_Ferrari_-_Lewis_Hamilton_-_Fanzone_Stage.jpg'],
  ['ALB', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Alex_Albon_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_(028A8626)_(cropped).jpg'],
  ['SAI', 'Venice, 2026', 'Photo LucaFazPhoto · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Carlos_Sainz_at_the_83rd_Venice_FILM_festival-9_(cropped).jpg'],
  ['LAW', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Liam_Lawson_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk,_Melbourne_(028A7795).jpg'],
  ['LIN', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Arvid_Lindblad_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk,_Melbourne_(028A7869)_(cropped).jpg'],
  ['ALO', 'Shanghai, 2026', 'Photo Liauzh · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Fernando_Alonso.jpg'],
  ['STR', 'Spielberg, 2022', 'Photo Lukas Raich · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:FIA_F1_Austria_2022_Lance_Stroll_(cropped).jpg'],
  ['OCO', 'Suzuka, 2024', 'Photo Rrtb505050 · CC0', 'https://commons.wikimedia.org/wiki/File:Esteban_Ocon_2024_Suzuka_(cropped).jpg'],
  ['BEA', 'Suzuka, 2025', 'Photo Liauzh · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:2025_Japan_GP_-_Haas_-_Oliver_Bearman_-_Thursday_(cropped).jpg'],
  ['HUL', 'Shanghai, 2026', 'Photo Liauzh · CC BY 4.0', 'https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Nico_Hulkenberg.jpg'],
  ['BOR', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Gabriel_Bortoleto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_(028A8581)_cropped.jpg'],
  ['COL', 'Melbourne, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Franco_Colapinto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_(028A8698)_cropped.jpg'],
  ['BOT', 'Adelaide, 2026', 'Photo Yu Chu Chin · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Valtteri_Bottas_at_the_2026_Adelaide_Motorsport_Festival_(028A7556).jpg'],
] as const

export const PORTRAITS: Partial<Record<string, Photo>> = Object.fromEntries(
  SOURCES.map(([code, place, credit, source]) => [code, { src: `/img/drivers/${code}.webp`, place, credit, source }]),
)

export const portraitFor = (code: string | null): Photo | undefined => (code ? PORTRAITS[code] : undefined)
